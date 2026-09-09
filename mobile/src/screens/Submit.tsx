import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, SafeAreaView, ActivityIndicator, Alert, Linking, Platform, Image, KeyboardAvoidingView, Animated, Easing, LayoutAnimation, UIManager } from "react-native";
import * as ImagePicker from "expo-image-picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { apiGet, apiPost, apiUpload, type AppealRes, type Category, type UploadFile } from "../api/client";
import { clearDraft, loadDraft, saveDraft } from "../storage";
import { success, tap } from "../haptics";
import { useToast } from "../toast";
import { fonts, shadow, useTheme, type Colors } from "../theme";



type Props = NativeStackScreenProps<RootStackParamList, "Submit">;

const STEPS = ["Рассказ", "Детали", "Отправка"];
const WHO_LABEL: Record<string, string> = { student: "Школьник", parent: "Родитель", teacher: "Педагог" };

const CLARIFYING = [
  { key: "where", q: "Где это происходит?", options: ["В школе", "В интернете", "Дома", "Другое"] },
  { key: "since", q: "Как давно?", options: ["Недавно", "Пару недель", "Пару месяцев", "Долго"] },
  { key: "who", q: "Кто рядом в этой истории?", options: ["Одноклассники", "Учитель", "Родители", "Незнакомые"] },
  { key: "asked", q: "Говорил(а) уже с кем-то?", options: ["Нет", "Да, учителю", "Да, родителям", "В другие места"] },
];
const CRISIS_MARKERS = ["хочу умереть", "не хочу жить", "самоубийств", "суицид", "убить", "насили", "угроз", "изби"];

if (Platform.OS === "android" && (UIManager as any)?.setLayoutAnimationEnabledExperimental) {
  (UIManager as any).setLayoutAnimationEnabledExperimental(true);
}

function StepPane({ dir, children }: { dir: number; children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.timing(v, { toValue: 1, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [v]);
  return (
    <Animated.View
      style={{
        opacity: v,
        transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [dir >= 0 ? 28 : -28, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

function Pop({ delay = 0, children }: { delay?: number; children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.timing(v, {
      toValue: 1, duration: 380, delay,
      easing: Easing.out(Easing.back(1.15)), useNativeDriver: true,
    });
    a.start();
    return () => a.stop();
  }, [v, delay]);
  return (
    <Animated.View
      style={{
        opacity: v,
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
          { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

export default function Submit({ navigation, route }: Props) {
  const { C } = useTheme();
  const { push: pushToast } = useToast();
  const st = useMemo(() => createStyles(C), [C]);
  const [applicantType, setApplicantType] = useState<string>(route.params?.applicantType ?? "student");
  const [cats, setCats] = useState<Category[]>([]);
  const [mode, setMode] = useState<"pick" | "free">("pick");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [freeText, setFreeText] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState<UploadFile[]>([]);
  const [sending, setSending] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [catsLoaded, setCatsLoaded] = useState(false);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [draftReady, setDraftReady] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [showQs, setShowQs] = useState(false);
  const [contactKind, setContactKind] = useState("телефон");
  const [contactValue, setContactValue] = useState("");
  const [contactConsent, setContactConsent] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const formal = applicantType !== "student";

  const goStep = (s: number) => {
    const t = Math.max(0, Math.min(2, s));
    setDir(t === step ? dir : t > step ? 1 : -1);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setStep(t);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  useEffect(() => {
    apiGet<Category[]>("/categories")
      .then((c) => setCats(c))
      .catch(() => setCats([]))
      .finally(() => setCatsLoaded(true));
  }, []);

  useEffect(() => {
    if (catsLoaded && cats.length === 0 && mode === "pick") setMode("free");
  }, [catsLoaded, cats, mode]);

  // Черновик: восстановить один раз при входе…
  useEffect(() => {
    loadDraft().then((d) => {
      if (d && (d.freeText || Object.keys(d.answers || {}).length > 0 || d.categoryId)) {
        setFreeText(d.freeText || "");
        setAnswers(d.answers || {});
        if (Object.keys(d.answers || {}).length > 0) setShowQs(true);
        setCategoryId(d.categoryId || null);
        if (d.mode === "pick" || d.mode === "free") setMode(d.mode);
        if (d.applicantType) setApplicantType(d.applicantType);
        const dd = d as any;
        if (dd.contactKind) setContactKind(dd.contactKind);
        if (dd.contactValue) setContactValue(dd.contactValue);
        if (dd.contactConsent) setContactConsent(true);
        setDraftRestored(true);
      }
      setDraftReady(true);
    });
  }, []);

  // …и тихо сохранять при каждом изменении (дебаунс)
  useEffect(() => {
    if (!draftReady) return;
    const t = setTimeout(() => {
      saveDraft({ freeText, answers, categoryId, mode, applicantType, contactKind, contactValue, contactConsent, savedAt: Date.now() } as any);
    }, 600);
    return () => clearTimeout(t);
  }, [freeText, answers, categoryId, mode, applicantType, contactKind, contactValue, contactConsent, draftReady]);

  // Кризис-маркеры ищем везде: текст + ответы (в режиме категорий текста может не быть)
  const searchable = `${freeText} ${Object.values(answers).join(" ")}`.toLowerCase();
  const maybeCrisis = CRISIS_MARKERS.some((m) => searchable.includes(m));
  const useFree = mode === "free" || (mode === "pick" && !categoryId);
  const textLen = freeText.trim().length;
  const catName = cats.find((c) => c.id === categoryId)?.name;
  const answeredCount = Object.keys(answers).length;

  const invalidReason: string | null =
    !catsLoaded ? "Загружаем ситуации…"
    : mode === "pick" && cats.length > 0 && !categoryId ? "Выбери ситуацию выше — без неё не отправим"
    : useFree && textLen < 10 ? `${formal ? "Расскажите" : "Расскажи"} чуть подробнее (ещё ${10 - textLen} симв.) — так проще помочь`
    : null;

  const pickImages = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, selectionLimit: 5, quality: 0.8 });
    if (res.canceled) return;
    const files: UploadFile[] = res.assets.map((a) => ({ uri: a.uri, name: a.fileName ?? `photo_${Date.now()}.jpg`, type: a.mimeType ?? "image/jpeg" }));
    setPicked((p) => p.concat(files).slice(0, 5));
  };

  const removePicked = (idx: number) => {
    setPicked((p) => p.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    if (invalidReason || sending) return;
    setSending(true);
    try {
      if (maybeCrisis) setShowHelp(true);
      const res = await apiPost<AppealRes>("/appeals", {
        applicant_type: applicantType,
        is_category_path: !useFree,
        category_id: useFree ? null : categoryId,
        free_text: useFree ? freeText : null,
        answers,
        contact_name: contactConsent && contactValue.trim() ? contactKind : null,
        contact_value: contactConsent && contactValue.trim() ? contactValue.trim() : null,
        contact_consent: contactConsent && !!contactValue.trim(),
      });
      await clearDraft();
      if (picked.length) { try { await apiUpload(`/appeals/${res.track_number}/attachments`, picked); } catch {} }
      success();
      navigation.replace("Result", { trackNumber: res.track_number });
    } catch (e: any) {
      if (Platform.OS === "web") window.alert(`Что-то пошло не так\n${String(e.message || e)}`);
      else pushToast("Что-то пошло не так, попробуй ещё раз");
    } finally { setSending(false); }
  };

  return (
    <SafeAreaView style={st.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
      <ScrollView ref={scrollRef} contentContainerStyle={st.container} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        {(showHelp || maybeCrisis) && (
          <View style={st.crisisBox}>
            <Text style={st.crisisTitle}>{formal ? "Вам не обязательно оставаться одним" : "Тебе не обязательно быть одному"}</Text>
            <Text style={st.crisisLine}>Психологическая помощь: 8-800-2000-122 (бесплатно, анонимно)</Text>
            <Text style={st.crisisLine}>Служба спасения: 112 (круглосуточно)</Text>
            <Pressable onPress={() => Linking.openURL("tel:112")}><Text style={st.crisisCall}>Позвонить 112 →</Text></Pressable>
          </View>
        )}

        <View style={st.progress}>
          {STEPS.map((label, i) => (
            <Pressable key={label} onPress={() => goStep(i)} style={st.pSeg}>
              <View style={[st.pBar, i <= step && st.pBarOn]} />
              <Text style={[st.pLabel, i === step && st.pLabelOn]}>{i + 1}. {label}</Text>
            </Pressable>
          ))}
        </View>

        {step === 0 && (
          <StepPane dir={dir}>
            <Pop>
            <View style={st.card}>
              <Text style={st.label}>{formal ? "Как вам удобнее рассказать?" : "Как тебе удобнее рассказать?"}</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 6 }}>
                <Pressable onPress={() => setMode("pick")} style={[st.seg, mode === "pick" && st.segActive]}><Text style={mode === "pick" ? st.segActiveText : st.segText}>Выбрать</Text></Pressable>
                <Pressable onPress={() => setMode("free")} style={[st.seg, mode === "free" && st.segActive]}><Text style={mode === "free" ? st.segActiveText : st.segText}>Своими словами</Text></Pressable>
              </View>
            </View>
            </Pop>

            <Pop delay={90}>
            {mode === "pick" ? (
              <View style={{ marginTop: 12 }}>
                {!catsLoaded && <Text style={st.loadingText}>Загружаем ситуации…</Text>}
                {catsLoaded && cats.length === 0 && (
                  <View style={st.offlineBox}>
                    <Text style={st.offlineText}>Не смогли загрузить список (нет сети?) — расскажи своими словами ниже</Text>
                  </View>
                )}
                {cats.map((c) => (
                  <Pressable
                    key={c.id}
                    style={[st.catBtn, categoryId === c.id && st.catBtnActive]}
                    onPress={() => {
                      tap();
                      if (c.is_free_fallback) { setMode("free"); setCategoryId(null); setFreeText(""); }
                      else { setCategoryId(c.id); goStep(1); }
                    }}
                  >
                    <Text style={categoryId === c.id ? st.catActiveText : st.catText}>{c.name}</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <>
                {draftRestored && <Text style={st.draftNote}>Вернули твой черновик — продолжай спокойно</Text>}
                <TextInput style={st.freeInput} multiline placeholder={formal ? "Расскажите, как есть. Можно несвязно — мы поймём и не осудим." : "Расскажи, как есть. Можно сбивчиво — мы поймём и не осудим."} value={freeText} onChangeText={setFreeText} placeholderTextColor={C.faint} />
                <View style={st.counterRow}>
                  <Text style={[st.counterText, textLen >= 10 && st.counterOk]}>
                    {textLen >= 10 ? "✓ достаточно, можно дальше" : `ещё ${10 - textLen} симв.`}
                  </Text>
                  <Text style={st.draftSaved}>черновик сохраняется</Text>
                </View>
              </>
            )}</Pop>

            <Pressable style={st.navNext} onPress={() => goStep(1)}>
              <Text style={st.navNextText}>Далее к деталям →</Text>
            </Pressable>
          </StepPane>
        )}

        {step === 1 && (
          <StepPane dir={dir}>
            <Pop>
            <View style={st.card}>
              <Text style={st.label}>Кто пишет?</Text>
              <Text style={st.whoHint}>Подберём специалиста и тон общения — на «ты» или на «вы».</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {[
                  { key: "student", label: "Школьник" },
                  { key: "parent", label: "Родитель" },
                  { key: "teacher", label: "Педагог" },
                ].map((t) => (
                  <Pressable key={t.key} onPress={() => setApplicantType(t.key)} style={[st.who, applicantType === t.key && st.whoActive]}>
                    <Text style={applicantType === t.key ? st.whoActiveText : st.whoText}>{t.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            </Pop>

            <Pop delay={90}>
            <View style={st.card}>
              <Pressable onPress={() => setShowQs((v) => !v)} style={st.qHead}>
                <View style={{ flex: 1 }}>
                  <Text style={st.label}>Вопросы для подбора специалиста</Text>
                  <Text style={st.whoHint}>
                    {answeredCount > 0 ? `Отвечено ${answeredCount} из 4 — можно дополнить` : "Необязательно · 30 секунд"}
                  </Text>
                </View>
                <Text style={st.qChevron}>{showQs ? "▾" : "▸"}</Text>
              </Pressable>
              {showQs && CLARIFYING.map((q) => (
                <View key={q.key} style={st.qBlock}>
                  <Text style={st.qText}>{q.q}</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {q.options.map((opt) => (
                      <Pressable key={opt} onPress={() => setAnswers((a) => ({ ...a, [q.key]: opt }))} style={[st.opt, answers[q.key] === opt && st.optActive]}>
                        <Text style={answers[q.key] === opt ? st.optActiveText : st.optText}>{opt}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}
            </View>
            </Pop>

            {maybeCrisis && (
              <Pop delay={140}>
              <View style={st.contactCard}>
                <Text style={st.label}>Оставить способ связи?</Text>
                <Text style={st.whoHint}>Необязательно. Увидит только оператор — чтобы быстрее помочь. Без галочки не сохраним.</Text>
                <View style={{ flexDirection: "row", gap: 6, marginBottom: 8 }}>
                  {["телефон", "telegram", "email"].map((k) => (
                    <Pressable key={k} onPress={() => setContactKind(k)} style={[st.opt, contactKind === k && st.optActive]}>
                      <Text style={contactKind === k ? st.optActiveText : st.optText}>{k}</Text>
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  style={st.contactInput}
                  value={contactValue}
                  onChangeText={setContactValue}
                  placeholder={contactKind === "телефон" ? "+7 …" : contactKind === "telegram" ? "@ник" : "почта…"}
                  placeholderTextColor={C.faint}
                  keyboardType={contactKind === "email" ? "email-address" : contactKind === "телефон" ? "phone-pad" : "default"}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setContactConsent((v) => !v)} style={st.consentRow}>
                  <View style={[st.checkbox, contactConsent && st.checkboxOn]}>
                    {contactConsent && <Text style={st.checkmark}>✓</Text>}
                  </View>
                  <Text style={st.consentText}>Согласен(на): оператор увидит этот контакт</Text>
                </Pressable>
              </View>
              </Pop>
            )}

            <Pop delay={180}>
            <View style={st.attachBox}>
              <Pressable onPress={pickImages} style={st.attachBtn}><Text style={st.attachText}>Добавить фото / скриншот ({picked.length}/5)</Text></Pressable>
              {picked.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.thumbs}>
                  {picked.map((f, i) => (
                    <View key={`${f.uri}-${i}`} style={st.thumbWrap}>
                      <Image source={{ uri: f.uri }} style={st.thumb} />
                      <Pressable style={st.thumbX} onPress={() => removePicked(i)} hitSlop={10}>
                        <Text style={st.thumbXText}>✕</Text>
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              )}
              <Text style={st.attachHint}>{picked.length > 0 ? "координаты и метаданные удалим автоматически" : "Метаданные и геометки удаляются автоматически"}</Text>
            </View>
            </Pop>

            <View style={st.navRow}>
              <Pressable style={st.navBack} onPress={() => goStep(0)}><Text style={st.navBackText}>← Назад</Text></Pressable>
              <Pressable style={st.navNextFlex} onPress={() => goStep(2)}><Text style={st.navNextText}>Проверить и отправить →</Text></Pressable>
            </View>
          </StepPane>
        )}

        {step === 2 && (
          <StepPane dir={dir}>
            <Pop>
            <View style={st.card}>
              <Text style={st.label}>Всё верно?</Text>
              <Text style={st.whoHint}>Нажми на строку, чтобы поправить. Дальше позаботимся мы.</Text>
              <Pressable style={st.sumRow} onPress={() => goStep(1)}><Text style={st.sumKey}>Кто</Text><Text style={st.sumVal}>{WHO_LABEL[applicantType]} ›</Text></Pressable>
              <Pressable style={st.sumRow} onPress={() => goStep(0)}>
                <Text style={st.sumKey}>История</Text>
                <Text style={st.sumVal}>{mode === "pick" && catName ? `${catName} ›` : `Своими словами (${textLen} симв.) ›`}</Text>
              </Pressable>
              {useFree && textLen > 0 && <Text style={st.sumExcerpt} numberOfLines={3}>«{freeText.trim().slice(0, 140)}{textLen > 140 ? "…" : ""}»</Text>}
              <Pressable style={st.sumRow} onPress={() => goStep(1)}><Text style={st.sumKey}>Детали</Text><Text style={st.sumVal}>{answeredCount > 0 ? `${answeredCount} из 4 ›` : "пропущены ›"}</Text></Pressable>
              <Pressable style={st.sumRow} onPress={() => goStep(1)}><Text style={st.sumKey}>Фото</Text><Text style={st.sumVal}>{picked.length > 0 ? `${picked.length} из 5 ›` : "нет ›"}</Text></Pressable>
              {contactConsent && contactValue.trim() ? (
                <Pressable style={st.sumRow} onPress={() => goStep(1)}><Text style={st.sumKey}>Связь</Text><Text style={st.sumVal}>{contactKind}: {contactValue.trim()} ›</Text></Pressable>
              ) : null}
              {maybeCrisis && (
                <View style={st.sumCrisis}><Text style={st.sumCrisisText}>Помечено как срочное — оператор увидит первым</Text></View>
              )}
            </View>
            </Pop>

            <Pressable
              style={[st.primary, (sending || invalidReason) && { opacity: 0.55 }]}
              onPress={submit}
              disabled={sending || !!invalidReason}
              accessibilityRole="button"
              accessibilityLabel="Отправить обращение"
              accessibilityState={{ disabled: sending || !!invalidReason }}
            >
              {sending ? <ActivityIndicator color="#fff" /> : <Text style={st.primaryText}>Отправить с доверием</Text>}
            </Pressable>
            {!!invalidReason && !sending && <Text style={st.sendHint}>{invalidReason}</Text>}

            <View style={st.navRow}>
              <Pressable style={st.navBack} onPress={() => goStep(1)}><Text style={st.navBackText}>← Вернуться и поправить</Text></Pressable>
            </View>
          </StepPane>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (C: Colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { padding: 18, paddingBottom: 32 },
  progress: { flexDirection: "row", gap: 8, marginBottom: 4 },
  pSeg: { flex: 1, alignItems: "center" },
  pBar: { height: 6, width: "100%", borderRadius: 4, backgroundColor: C.line, marginBottom: 6 },
  pBarOn: { backgroundColor: C.teal },
  pLabel: { fontSize: 12, color: C.faint, fontWeight: "600" },
  pLabelOn: { color: C.tealDeep, fontWeight: "800" },
  card: { backgroundColor: C.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: C.line, marginTop: 12, ...shadow },
  label: { fontSize: 16, fontWeight: "800", color: C.ink, marginBottom: 6, fontFamily: fonts.head },
  whoHint: { fontSize: 12.5, color: C.muted, marginBottom: 10, lineHeight: 18 },
  who: { flex: 1, paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.surface, alignItems: "center" },
  whoActive: { borderColor: C.teal, backgroundColor: C.tealSoft },
  whoText: { color: C.muted, fontSize: 12.5, fontWeight: "600" },
  whoActiveText: { color: C.tealDeep, fontWeight: "800", fontSize: 12.5 },
  seg: { flex: 1, padding: 13, borderRadius: 12, borderWidth: 1.5, borderColor: C.line, alignItems: "center", backgroundColor: "#fff" },
  segActive: { borderColor: C.teal, backgroundColor: C.tealSoft },
  segText: { color: C.muted, fontWeight: "600" },
  segActiveText: { color: C.tealDeep, fontWeight: "800" },
  catBtn: { padding: 15, borderRadius: 14, borderWidth: 1.5, borderColor: C.line, marginBottom: 8, backgroundColor: C.surface },
  catBtnActive: { borderColor: C.teal, backgroundColor: C.tealSoft },
  catText: { color: C.ink, fontSize: 14.5 },
  catActiveText: { color: C.tealDeep, fontWeight: "800", fontSize: 14.5 },
  freeInput: { marginTop: 12, minHeight: 130, borderWidth: 1.5, borderColor: C.line, borderRadius: 16, padding: 14, fontSize: 15, textAlignVertical: "top", backgroundColor: C.surface, color: C.ink, lineHeight: 22 },
  draftNote: { fontSize: 13, color: C.tealDeep, fontWeight: "700", backgroundColor: C.tealSoft, borderRadius: 10, padding: 10, marginTop: 12, textAlign: "center" },
  counterRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  counterText: { fontSize: 12.5, color: C.muted, fontWeight: "600" },
  counterOk: { color: C.ok, fontWeight: "800" },
  draftSaved: { fontSize: 11.5, color: C.faint },
  subLabel: { fontSize: 13, color: C.muted, marginBottom: 10, lineHeight: 19 },
  qHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  qChevron: { fontSize: 20, color: C.tealDeep, fontWeight: "800" },
  qBlock: { marginBottom: 14 },
  qText: { fontSize: 14, fontWeight: "700", color: C.ink, marginBottom: 8 },
  opt: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999, borderWidth: 1.5, borderColor: C.line, backgroundColor: "#fff" },
  optActive: { borderColor: C.teal, backgroundColor: C.tealSoft },
  optText: { color: C.muted, fontSize: 13 },
  optActiveText: { color: C.tealDeep, fontWeight: "800", fontSize: 13 },
  crisisBox: { backgroundColor: C.crisisBg, borderWidth: 1.5, borderColor: "#e8b8a6", borderRadius: 18, padding: 16, marginBottom: 6 },
  crisisTitle: { fontSize: 15, fontWeight: "800", color: C.crisis, marginBottom: 8 },
  crisisLine: { fontSize: 13.5, color: C.ink, marginBottom: 3, lineHeight: 19 },
  crisisCall: { fontSize: 14, fontWeight: "800", color: C.crisis, marginTop: 8 },
  sumRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.line },
  sumKey: { fontSize: 13, color: C.muted, fontWeight: "600" },
  sumVal: { fontSize: 13.5, color: C.ink, fontWeight: "700", textAlign: "right", flex: 1 },
  sumExcerpt: { fontSize: 13, fontStyle: "italic", color: C.muted, lineHeight: 19, backgroundColor: C.bg, borderRadius: 10, padding: 10, marginTop: 4 },
  sumCrisis: { marginTop: 10, backgroundColor: C.crisisBg, borderWidth: 1, borderColor: "#e8b8a6", borderRadius: 12, padding: 10 },
  sumCrisisText: { fontSize: 12.5, color: C.crisis, fontWeight: "700", textAlign: "center" },
  navRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  navBack: { padding: 15, borderRadius: 14, alignItems: "center", borderWidth: 1.5, borderColor: C.line, backgroundColor: C.surface },
  navBackText: { color: C.muted, fontWeight: "700", fontSize: 14 },
  navNext: { backgroundColor: C.btn, padding: 16, borderRadius: 14, alignItems: "center", marginTop: 16, ...shadow },
  navNextFlex: { flex: 1, backgroundColor: C.btn, padding: 15, borderRadius: 14, alignItems: "center", ...shadow },
  navNextText: { color: C.onBtn, fontWeight: "800", fontSize: 15, fontFamily: fonts.bold },
  primary: { backgroundColor: C.btn, padding: 17, borderRadius: 16, alignItems: "center", marginTop: 16, ...shadow },
  primaryText: { color: C.onBtn, fontSize: 16, fontWeight: "800", fontFamily: fonts.bold },
  sendHint: { fontSize: 13, color: C.muted, textAlign: "center", marginTop: 10, lineHeight: 19 },
  loadingText: { textAlign: "center", color: C.muted, padding: 16, fontSize: 14 },
  offlineBox: { backgroundColor: C.warnBg, borderWidth: 1.5, borderColor: "#ead9a8", borderRadius: 14, padding: 14, marginBottom: 8 },
  offlineText: { fontSize: 13.5, color: C.ink, lineHeight: 20, textAlign: "center" },
  attachBox: { marginTop: 14 },
  attachBtn: { padding: 15, borderRadius: 14, borderWidth: 1.5, borderColor: C.teal, backgroundColor: C.tealSoft, alignItems: "center" },
  attachText: { color: C.tealDeep, fontWeight: "800", fontSize: 14 },
  attachHint: { fontSize: 12, color: C.muted, marginTop: 8, textAlign: "center" },
  contactCard: { backgroundColor: C.surface, borderRadius: 20, padding: 16, borderWidth: 1.5, borderColor: "#e8b8a6", marginTop: 12, ...shadow },
  contactInput: { borderWidth: 1.5, borderColor: C.line, borderRadius: 12, padding: 12, fontSize: 15, backgroundColor: C.surface, color: C.ink },
  consentRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 1.5, borderColor: C.teal, backgroundColor: C.surface, alignItems: "center", justifyContent: "center" },
  checkboxOn: { backgroundColor: C.tealSoft },
  checkmark: { color: C.tealDeep, fontWeight: "800", fontSize: 14 },
  consentText: { fontSize: 13, color: C.ink, flex: 1, lineHeight: 18 },
  thumbs: { gap: 10, paddingVertical: 12, paddingHorizontal: 2 },
  thumbWrap: { position: "relative" },
  thumb: { width: 76, height: 76, borderRadius: 14, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.surface },
  thumbX: { position: "absolute", top: -8, right: -8, width: 26, height: 26, borderRadius: 13, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.line, alignItems: "center", justifyContent: "center" },
  thumbXText: { fontSize: 12, color: C.crisis, fontWeight: "800" },
});
