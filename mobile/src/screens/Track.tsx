import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, Pressable, TextInput, ScrollView, Alert, Platform, RefreshControl, Animated, Easing } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { apiGet, apiPost, wsUrl, type AppealDetail, type AppealMessage } from "../api/client";
import { notifyAnswerReady } from "../notify";
import { success, tap } from "../haptics";
import { useToast } from "../toast";
import { fonts, shadow, useTheme, type Colors } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Track">;

const STATUS_LABEL: Record<string, string> = {
  new: "Мы рядом — обращение получено",
  assigned: "Передали бережному специалисту",
  in_progress: "Специалист внимательно разбирается",
  need_clarification: "Специалист задал вопрос — загляни ниже",
  answer_ready: "Готов тёплый ответ для тебя",
  returned: "Мы вернулись к твоей истории",
  completed: "Рады, что стало легче",
  rejected: "Здесь помочь сложно — подскажем, куда ещё можно",
  closed_no_answer: "История закрыта, но можно написать снова",
};
const STAGE_HINT: Record<string, string> = {
  new: "Обычно отвечают в течение дня — можешь закрыть приложение, номер сохранён",
  assigned: "Специалист уже видит твою историю и скоро напишет",
  in_progress: "Идёт разбор — ничего делать не нужно, просто заглядывай",
  need_clarification: "Ответь специалисту в чате ниже — это ускорит помощь",
  answer_ready: "Читай ответ в чате и скажи, стало ли легче",
  returned: "Оператор пересматривает историю и подберёт решение",
};
const TERMINAL_STATUSES = ["completed", "rejected", "closed_no_answer"];

const STATUS_EVENT: Record<string, string> = {
  assigned: "Передали бережному специалисту",
  in_progress: "Специалист разбирается в ситуации",
  need_clarification: "Специалист задал вопрос",
  answer_ready: "Ответ готов",
  returned: "Вернулись к истории",
  completed: "Стало легче — завершено",
  rejected: "Подсказали, куда ещё можно обратиться",
  closed_no_answer: "История закрыта",
};

const RU_MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

function pad2(n: number): string { return String(n).padStart(2, "0"); }

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  } catch { return ""; }
}

function fmtDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()} · ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  } catch { return ""; }
}

function dayKey(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  } catch { return ""; }
}

function fmtDayLabel(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diffDays = Math.round((startOf(now) - startOf(d)) / 86400000);
    if (diffDays <= 0) return "Сегодня";
    if (diffDays === 1) return "Вчера";
    return `${d.getDate()} ${RU_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  } catch { return ""; }
}

function buildTimeline(data: { created_at?: string; status?: string; statuses?: { to_status: string; created_at: string }[] }): { text: string; at: string }[] {
  const ev = [{ text: "Ты поделился историей", at: data.created_at || "" }];
  for (const s of data.statuses || []) {
    // текущий статус показан заголовком карточки — в историю его не дублируем
    if (s.to_status === data.status) continue;
    const text = STATUS_EVENT[s.to_status];
    if (text && s.created_at) ev.push({ text, at: s.created_at });
  }
  return ev;
}

function MsgBubble({ style, textStyle, metaStyle, text, meta, delay = 0, a11yLabel }: {
  style: any; textStyle: any; metaStyle: any; text: string; meta?: string; delay?: number; a11yLabel?: string;
}) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.timing(v, {
      toValue: 1, duration: 300, delay,
      easing: Easing.out(Easing.back(1.2)), useNativeDriver: Platform.OS !== "web",
    });
    a.start();
    return () => a.stop();
  }, [v, delay]);
  return (
    <Animated.View
      style={[{ opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] }, style]}
      accessible
      accessibilityLabel={a11yLabel ?? text}
    >
      <Text style={textStyle}>{text}</Text>
      {!!meta && <Text style={metaStyle}>{meta}</Text>}
    </Animated.View>
  );
}

function TypingDots({ color }: { color: string }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 600, easing: Easing.linear, useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(v, { toValue: 0, duration: 600, easing: Easing.linear, useNativeDriver: Platform.OS !== "web" }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  const dotStyle = {
    width: 7, height: 7, borderRadius: 4, backgroundColor: color,
    opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
  };
  return (
    <View style={{ flexDirection: "row", gap: 4, paddingHorizontal: 6, paddingBottom: 4 }} accessibilityLabel="Специалист пишет">
      {[0, 1, 2].map((i) => (
        <Animated.View key={i} style={dotStyle} />
      ))}
    </View>
  );
}

function askReason(cb: (reason: string) => void, fallback = "не помогло") {
  if (Platform.OS === "web") { const reason = (globalThis as any).prompt("Расскажи, чего не хватило", ""); cb(reason ?? fallback); }
  else if (Platform.OS === "android") cb(fallback); // Alert.prompt есть только на iOS
  else Alert.prompt("Расскажи, чего не хватило", "Это поможет помочь лучше", (reason: string) => cb(reason || fallback));
}

export default function Track({ route }: Props) {
  const { C } = useTheme();
  const { push: pushToast } = useToast();
  const st = useMemo(() => createStyles(C), [C]);
  const initial = route.params?.initialTrack ?? "";
  const [track, setTrack] = useState(initial);
  const [data, setData] = useState<AppealDetail | null>(null);
  const [messages, setMessages] = useState<AppealMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [typing, setTyping] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimer = useRef<any>(null);

  const keyOf = (m: AppealMessage) => (m && m.id ? `id:${m.id}` : `${m?.author_type}|${m?.created_at}|${m?.text}`);
  const byTime = (a: AppealMessage, b: AppealMessage) => (Date.parse(a.created_at) || 0) - (Date.parse(b.created_at) || 0);
  const addLive = (m: AppealMessage) => { setMessages((prev) => { if (prev.some((p) => keyOf(p) === keyOf(m))) return prev; return [...prev, m].sort(byTime); }); };

  useEffect(() => () => {
    wsRef.current?.close();
    if (typingTimer.current) clearTimeout(typingTimer.current);
  }, []);
  useEffect(() => { if (initial) lookup(initial); }, []);

  const openSocket = (tn: string) => {
    wsRef.current?.close();
    const ws = new WebSocket(wsUrl(`/ws/appeals/${encodeURIComponent(tn)}`));
    ws.onerror = () => {};
    ws.onmessage = (e) => {
      try {
        const m = JSON.parse(e.data);
        if (m.event === "typing") {
          setTyping(true);
          clearTimeout(typingTimer.current);
          typingTimer.current = setTimeout(() => setTyping(false), 3000);
          return;
        }
        if (m.event !== "message") return;
        setTyping(false);
        addLive(m);
      } catch {}
    };
    wsRef.current = ws;
  };
  const prevStatus = useRef<string | null>(null);
  const lookup = async (t?: string) => {
    const tn = (t ?? track).trim().toUpperCase();
    if (!tn) return;
    setLoading(true); setError(""); wsRef.current?.close();
    try {
      const res = await apiGet<AppealDetail>(`/appeals/${encodeURIComponent(tn)}`);
      if (res.status === "answer_ready" && prevStatus.current && prevStatus.current !== "answer_ready") {
        notifyAnswerReady();
      }
      prevStatus.current = res.status;
      setData(res); setMessages(Array.isArray(res.messages) ? res.messages.slice() : []); setTrack(tn); openSocket(tn);
      setUpdatedAt(new Date().toISOString());
    } catch { setError("Не нашли такой номер. Проверь буквы — или подожди минутку."); setData(null); } finally { setLoading(false); }
  };
  const onRefresh = async () => {
    if (!track.trim() || !data) return;
    setRefreshing(true);
    try {
      const res = await apiGet<AppealDetail>(`/appeals/${encodeURIComponent(track.trim().toUpperCase())}`);
      setData((prev: any) => (prev ? { ...res } : res));
      setMessages(Array.isArray(res.messages) ? res.messages.slice() : []);
      setUpdatedAt(new Date().toISOString());
    } catch {} finally { setRefreshing(false); }
  };
  const sendMsg = async () => {
    if (!draft.trim() || !data) return;
    try { const m = await apiPost<AppealMessage>(`/appeals/${encodeURIComponent(track)}/messages`, { text: draft.trim() }); addLive(m); setDraft(""); success(); } catch {}
  };
  const [score, setScore] = useState(0);
  const [fbComment, setFbComment] = useState("");
  const [complain, setComplain] = useState(false);

  const sendFeedback = async (reason?: string) => {
    if (!data) return;
    try {
      await apiPost(`/appeals/${encodeURIComponent(track)}/feedback`, {
        score: score || null,
        comment: [fbComment.trim(), reason].filter(Boolean).join(" · ") || null,
        complain,
        complain_text: complain ? (fbComment.trim() || reason || "жалоба без текста") : null,
      });
    } catch {}
  };
  const resetFb = () => { setScore(0); setFbComment(""); setComplain(false); };
  const resolve = async (helped: boolean) => {
    if (!data) return;
    if (helped) { await sendFeedback(); await apiPost(`/appeals/${encodeURIComponent(track)}/resolve`); resetFb(); success(); lookup(track); }
    else askReason(async (reason) => {
      try {
        await sendFeedback(reason);
        await apiPost(`/appeals/${encodeURIComponent(track)}/return`, { text: reason });
        resetFb(); lookup(track);
      } catch (e: any) {
        if (Platform.OS === "web") window.alert(String(e.message || e));
        else pushToast(`Не получилось вернуть: ${String(e.message || e)}`);
      }
    }, fbComment.trim() || "не помогло");
  };

  const timeline = data ? buildTimeline(data) : [];

  const webWrap = Platform.OS === "web" ? ({ overflowWrap: "anywhere", wordBreak: "break-word" } as any) : null;

  type ChatRow =
    | { kind: "day"; label: string; key: string }
    | { kind: "msg"; msg: AppealMessage; showAuthor: boolean; key: string; index: number };
  const chatRows: ChatRow[] = useMemo(() => {
    const sorted = [...messages].sort(byTime);
    const rows: ChatRow[] = [];
    let li = 0;
    let prevDay = "";
    let prevAuthor = "";
    for (const m of sorted) {
      const day = dayKey(m.created_at);
      if (day !== prevDay) {
        rows.push({ kind: "day", label: fmtDayLabel(m.created_at), key: `day:${day || li}` });
        prevDay = day;
        prevAuthor = "";
      }
      const showAuthor = m.author_type !== prevAuthor;
      prevAuthor = m.author_type;
      rows.push({ kind: "msg", msg: m, showAuthor, key: keyOf(m), index: li });
      li += 1;
    }
    return rows;
  }, [messages]);

  return (
    <SafeAreaView style={st.safe}>
      <ScrollView
        contentContainerStyle={st.container}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.teal} />}
      >
        <View style={st.card}>
          <Text style={st.label}>Твой номер (ОТК-…)</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput style={st.input} autoCapitalize="characters" value={track} onChangeText={setTrack} placeholder="ОТК-XXXX-XXXX" placeholderTextColor={C.faint} accessibilityLabel="Номер обращения" autoComplete="off" />
            <Pressable style={st.btn} onPress={() => lookup()} accessibilityRole="button" accessibilityHint="Найти обращение по номеру"><Text style={st.btnText}>Найти</Text></Pressable>
          </View>
        </View>
        {loading && !data && (
          <View style={{ marginTop: 20, gap: 10 }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[st.skel, { width: `${88 - i * 12}%` }]} />
            ))}
          </View>
        )}
        {error ? <Text style={st.error}>{error}</Text> : null}

        {data && (
          <View style={{ marginTop: 14 }}>
            <View style={st.statusCard}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={st.safeMini}>Анонимно · тебя не видно</Text>
                <Pressable
                  onPress={onRefresh} style={st.refreshBtn} hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={updatedAt ? `Обновить, последнее обновление ${fmtDateTime(updatedAt)}` : "Обновить"}
                >
                  <Text style={st.refreshText}>{updatedAt ? fmtDateTime(updatedAt) : "Обновить"}</Text>
                </Pressable>
              </View>
              <Text style={st.statusTitle} accessibilityLiveRegion="polite">{STATUS_LABEL[data.status] || data.status}</Text>
              <Text style={st.track}>{data.track_number}</Text>

              <View style={st.timeline} accessibilityRole="list">
                {timeline.map((e, i) => (
                  <View key={`${e.at}-${i}`} style={st.tlRow} accessibilityRole="text">
                    <View style={st.tlRail} importantForAccessibility="no-hide-descendants">
                      <View style={[st.tlDot, i === timeline.length - 1 && st.tlDotNow]} />
                      {i < timeline.length - 1 && <View style={st.tlLine} />}
                    </View>
                    <View style={[st.tlBody, i === timeline.length - 1 && st.tlBodyNow]}>
                      <Text style={[st.tlText, webWrap]}>{e.text}</Text>
                      {!!e.at && <Text style={st.tlDate}>{fmtDateTime(e.at)}</Text>}
                    </View>
                  </View>
                ))}
              </View>
              {!!STAGE_HINT[data.status] && <Text style={st.stageHint}>{STAGE_HINT[data.status]}</Text>}
            </View>

            <View style={st.chat} accessibilityRole="list">
              {chatRows.map((r) => {
                if (r.kind === "day") {
                  return (
                    <View key={r.key} style={st.dayPill}>
                      <Text style={st.dayPillText}>{r.label}</Text>
                    </View>
                  );
                }
                const m = r.msg;
                const mine = m.author_type === "applicant";
                const author = mine ? "Ты" : "Специалист";
                const time = fmtTime(m.created_at);
                return (
                  <MsgBubble
                    key={r.key}
                    delay={r.index < 20 ? Math.min(r.index * 40, 400) : 0}
                    style={[st.bubble, mine ? st.bubbleMine : st.bubbleTheirs]}
                    textStyle={[mine ? st.bubbleMineText : st.bubbleTheirsText, webWrap]}
                    metaStyle={mine ? st.bubbleMineMeta : st.bubbleTheirsMeta}
                    text={m.text}
                    meta={`${r.showAuthor ? `${author} · ` : ""}${time}`}
                    a11yLabel={`${author}, ${time}, ${m.text}`}
                  />
                );
              })}
              {typing && (
                <View style={[st.bubble, st.bubbleTheirs]} accessibilityLiveRegion="polite">
                  <Text style={st.bubbleTheirsText}>Специалист пишет</Text>
                  <TypingDots color={C.muted} />
                </View>
              )}
              {chatRows.length === 0 && !typing && (
                <View style={st.emptyChat}>
                  <Text style={st.emptyChatTitle}>Пока тихо</Text>
                  <Text style={st.emptyChatText}>Специалист уже видит твою историю и скоро напишет. Можешь дополнить детали ниже.</Text>
                </View>
              )}
            </View>

            {!TERMINAL_STATUSES.includes(data.status) && (
              <>
                <TextInput style={st.msgInput} multiline placeholder="Написать специалисту…" placeholderTextColor={C.faint} value={draft} onChangeText={setDraft} accessibilityLabel="Сообщение специалисту" />
                <Pressable style={st.btnFull} onPress={sendMsg} accessibilityRole="button" accessibilityLabel="Отправить сообщение специалисту"><Text style={st.btnText}>Отправить</Text></Pressable>
              </>
            )}
            {data.status === "answer_ready" && (
              <View style={st.rateCard}>
                <Text style={st.rateTitle}>Как тебе ответ?</Text>
                <View style={st.stars} accessibilityRole="radiogroup" accessibilityLabel="Оценка помощи от 1 до 5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => { tap(); setScore(s); }}
                      hitSlop={12}
                      accessibilityRole="radio"
                      accessibilityLabel={`Оценить на ${s} из 5`}
                      accessibilityState={{ selected: score === s }}
                    >
                      <Text style={[st.star, s <= score && st.starOn]}>★</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={st.rateHint}>
                  {score === 0 ? "Нажми на звёзды — это поможет нам стать лучше" : score <= 2 ? "Жаль, что не помогло — расскажи, что не так" : score === 3 ? "Средне — что можно улучшить?" : "Рады! Пара слов — что помогло сильнее?"}
                </Text>
                <TextInput
                  style={st.rateInput}
                  multiline
                  value={fbComment}
                  onChangeText={setFbComment}
                  placeholder="Пара слов (необязательно)…"
                  placeholderTextColor={C.faint}
                />
                <Pressable onPress={() => setComplain((v) => !v)} style={st.complainRow} accessibilityRole="checkbox" accessibilityState={{ checked: complain }} accessibilityLabel="Пожаловаться на специалиста">
                  <View style={[st.checkbox, complain && st.checkboxOn]}>
                    {complain && <Text style={st.checkmark}>✓</Text>}
                  </View>
                  <Text style={st.complainText}>Пожаловаться на специалиста — увидит только оператор</Text>
                </Pressable>
                <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                  <Pressable style={[st.btnFull, { flex: 1, backgroundColor: C.ok, marginTop: 0 }]} onPress={() => resolve(true)}><Text style={st.btnText}>Стало легче</Text></Pressable>
                  <Pressable style={[st.btnFull, { flex: 1, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.crisis, marginTop: 0 }]} onPress={() => resolve(false)}><Text style={[st.btnText, { color: C.crisis }]}>Нужно ещё</Text></Pressable>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (C: Colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { padding: 18, paddingBottom: 32 },
  card: { backgroundColor: C.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: C.line, ...shadow },
  label: { fontSize: 15, fontWeight: "800", marginBottom: 10, color: C.ink },
  input: { flex: 1, borderWidth: 1.5, borderColor: C.line, borderRadius: 12, padding: 13, fontSize: 15, backgroundColor: C.surface, color: C.ink, letterSpacing: 1 },
  msgInput: { borderWidth: 1.5, borderColor: C.line, borderRadius: 14, padding: 13, fontSize: 15, backgroundColor: C.surface, color: C.ink, marginTop: 10, minHeight: 56 },
  btn: { backgroundColor: C.btn, paddingHorizontal: 18, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  btnFull: { backgroundColor: C.btn, padding: 15, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 10 },
  btnText: { color: C.onBtn, fontWeight: "800", fontSize: 15, fontFamily: fonts.bold },
  error: { color: C.crisis, marginTop: 14, textAlign: "center" },
  statusCard: { backgroundColor: C.surface, borderWidth: 1, borderColor: "#cfe3d4", borderRadius: 20, padding: 18, marginBottom: 12, ...shadow },
  safeMini: { fontSize: 11.5, color: C.tealDeep, fontWeight: "800", backgroundColor: C.sageSoft, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginBottom: 8 },
  statusTitle: { fontSize: 18, fontWeight: "800", color: C.tealDeep, lineHeight: 24 },
  track: { color: C.muted, fontSize: 14, marginTop: 4, marginBottom: 14, letterSpacing: 1.5, fontWeight: "700" },
  refreshBtn: { marginLeft: "auto", padding: 6 },
  refreshText: { fontSize: 12, color: C.tealDeep, fontWeight: "700" },
  timeline: { marginTop: 14 },
  tlRow: { flexDirection: "row", gap: 10 },
  tlRail: { alignItems: "center", width: 18 },
  tlDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: C.faint, marginTop: 4 },
  tlDotNow: { backgroundColor: C.teal, width: 14, height: 14, borderRadius: 7 },
  tlLine: { width: 2, flex: 1, minHeight: 16, backgroundColor: C.line, borderRadius: 2, marginVertical: 3 },
  tlBody: { flex: 1, paddingBottom: 14 },
  tlBodyNow: { backgroundColor: C.tealSoft, borderRadius: 12, padding: 10, marginBottom: 14, paddingBottom: 10, borderWidth: 1, borderColor: "#cfe3d4" },
  tlText: { fontSize: 13.5, color: C.ink, fontWeight: "600", lineHeight: 19 },
  tlDate: { fontSize: 11.5, color: C.muted, marginTop: 3 },
  stageHint: { fontSize: 12.5, color: C.muted, lineHeight: 18, backgroundColor: C.bg, borderRadius: 10, padding: 10 },
  chat: { backgroundColor: C.surface, borderRadius: 18, padding: 12, marginBottom: 4, borderWidth: 1, borderColor: C.line },
  typing: { fontSize: 12.5, color: C.muted, fontStyle: "italic", paddingHorizontal: 6, paddingBottom: 4 },
  dayPill: { alignSelf: "center", backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, marginVertical: 8 },
  dayPillText: { fontSize: 12, color: C.muted, fontWeight: "700" },
  emptyChat: { alignItems: "center", paddingVertical: 16, paddingHorizontal: 12 },
  emptyChatTitle: { fontSize: 15, fontWeight: "800", color: C.ink, marginBottom: 4 },
  emptyChatText: { fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 19 },
  skel: { height: 64, borderRadius: 14, backgroundColor: C.line, borderWidth: 1, borderColor: C.line },
  bubble: { borderRadius: 16, padding: 12, marginBottom: 8, maxWidth: "86%", flexShrink: 1 },
  bubbleMine: { alignSelf: "flex-end", backgroundColor: C.btn, borderBottomRightRadius: 6 },
  bubbleTheirs: { alignSelf: "flex-start", backgroundColor: C.sageSoft, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: "#cfe3d4" },
  bubbleMineText: { color: C.onBtn, fontSize: 14.5, lineHeight: 20 },
  bubbleTheirsText: { color: C.ink, fontSize: 14.5, lineHeight: 20 },
  bubbleMineMeta: { color: C.onBtn, opacity: 0.75, fontSize: 11, marginTop: 4, textAlign: "right" },
  bubbleTheirsMeta: { color: C.muted, fontSize: 11, marginTop: 4 },
  rateCard: { backgroundColor: C.surface, borderWidth: 1.5, borderColor: "#cfe3d4", borderRadius: 18, padding: 16, marginTop: 12, ...shadow },
  rateTitle: { fontSize: 16, fontWeight: "800", color: C.ink, textAlign: "center" },
  stars: { flexDirection: "row", justifyContent: "center", gap: 6, marginVertical: 10 },
  star: { fontSize: 34, color: C.line },
  starOn: { color: "#E9A13B" },
  rateHint: { fontSize: 12.5, color: C.muted, textAlign: "center", lineHeight: 18 },
  rateInput: { borderWidth: 1.5, borderColor: C.line, borderRadius: 12, padding: 12, fontSize: 14, backgroundColor: C.surface, color: C.ink, marginTop: 10, minHeight: 52 },
  complainRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 1.5, borderColor: C.teal, backgroundColor: C.surface, alignItems: "center", justifyContent: "center" },
  checkboxOn: { backgroundColor: C.tealSoft },
  checkmark: { color: C.tealDeep, fontWeight: "800", fontSize: 14 },
  complainText: { fontSize: 13, color: C.ink, flex: 1, lineHeight: 18 },
});
