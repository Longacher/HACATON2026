import { useEffect, useRef, useState } from "react";
import {
  Alert, Animated, Image, Linking, ScrollView, Text, TextInput, TouchableOpacity, useWindowDimensions, View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { pick, types } from "@react-native-documents/picker";
import { API_URL, apiGet, apiPost } from "../api";
import { C, S } from "../theme";
import { DottedPath, Journey, PhoneIcon, Sprout, Squiggle, WaxSeal } from "../art";
import { FadeIn, Splash, shouldSplash } from "../anim";

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[S.chip, on && S.chipOn]} onPress={onPress}>
      <Text style={[S.chipText, on && S.chipTextOn]}>{label}</Text>
    </TouchableOpacity>
  );
}

export const HELP_NUM = "88002000122";
export const HELP_NOW = "Детский телефон доверия: 8-800-2000-122 — бесплатно, круглосуточно. Там живые люди.";

export function callNow() {
  Linking.openURL(`tel:${HELP_NUM}`).catch(() => {});
}

/** Несмываемая полоса экстренного звонка — 1 тап до звонилки, с любого экрана. */
function SosBar() {
  return (
    <TouchableOpacity style={S.sos} onPress={callNow} activeOpacity={0.85}>
      <PhoneIcon />
      <View>
        <Text style={S.sosText}>Экстренный звонок</Text>
        <Text style={S.sosNum}>8-800-2000-122 · бесплатно</Text>
      </View>
    </TouchableOpacity>
  );
}

/** Тихая ссылка помощи — на каждом экране, не красная, не тревожная. */
function HelpNow() {
  return (
    <TouchableOpacity onPress={() => Alert.alert("Мы рядом", HELP_NOW, [
      { text: "Позвонить", onPress: callNow },
      { text: "Хорошо", style: "cancel" },
    ])}>
      <Text style={[S.small, { textAlign: "center", marginTop: 14, textDecorationLine: "underline" }]}>
        Нужна помощь прямо сейчас?
      </Text>
    </TouchableOpacity>
  );
}
/** Дыхательная пауза: вдох 4с → пауза 4с → выдох 6с. Для экранов ожидания. */
function BreathCard() {
  const phases: [string, number][] = [["Вдох…", 4], ["Пауза…", 4], ["Выдох…", 6]];
  const [pi, setPi] = useState(0);
  const [left, setLeft] = useState(4);
  useEffect(() => {
    const t = setInterval(() => {
      setLeft((l) => {
        if (l > 1) return l - 1;
        setPi((p) => (p + 1) % phases.length);
        return phases[(pi + 1) % phases.length][1];
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pi]);
  return (
    <View style={[S.card, { alignItems: "center" }]}>
      <Sprout />
      <Text style={S.h2}>Пока ждёшь — подыши с нами</Text>
      <Text style={[S.display, { textAlign: "center" }]}>{phases[pi][0]}</Text>
      <Text style={S.small}>{left} сек · повтори 3 раза · станет тише</Text>
    </View>
  );
}

/** Короткая поддерживающая строка под шаги подачи. */
const TIPS = [
  "Спешить некуда — всё можно пропускать.",
  "Писать можно с середины. Хоть с конца.",
  "Ты не виноват в том, что происходит.",
  "Просить помощи — нормально. Это сильный шаг.",
  "Здесь никто не видит твоего имени.",
  "Коротко — тоже ответ. Пара фраз хватит.",
  "Можно вернуться назад на любом шаге.",
  "Мы рядом, даже если отвечаем не сразу.",
];
function TipCard({ step }: { step: number }) {
  return (
    <View style={[S.card, { flexDirection: "row", alignItems: "center", gap: 12 }]}>
      <Sprout size={52} />
      <Text style={[S.p, { flex: 1 }]}>{TIPS[step % TIPS.length]}</Text>
    </View>
  );
}

/** Сегменты прогресса как в сторис. */
function Segments({ n, i }: { n: number; i: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 6, paddingHorizontal: 18, paddingTop: 8 }}>
      {Array.from({ length: n }).map((_, k) => (
        <View key={k} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: k <= i ? C.brand : C.line }} />
      ))}
    </View>
  );
}

export function Home({ nav }: { nav: (s: string) => void }) {
  const { width } = useWindowDimensions();
  const ref = useRef<any>(null);
  const [page, setPage] = useState(0);
  const [intro, setIntro] = useState(shouldSplash());
  const go = (p: number) => ref.current?.scrollTo({ x: p * width, animated: true });
  return (
    <View style={S.wrap}>
      {intro && <Splash onDone={() => setIntro(false)} />}
      <ScrollView
        ref={ref} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
      >
        {/* Сторис 1 */}
        <View style={{ width }}>
          <View style={{ marginHorizontal: 18, marginTop: 12, borderRadius: 24, overflow: "hidden", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: C.line }}>
            <Image
              source={require("../../assets/hug.png")}
              style={{ width: "100%", height: 300 }}
              resizeMode="cover"
            />
          </View>
          <View style={{ paddingHorizontal: 22, marginTop: 10 }}>
            <FadeIn delay={80}><Text style={S.display}>Ты не один.{"\n"}<Text style={S.displayItalic}>Мы рядом — по-настоящему.</Text></Text></FadeIn>
            <FadeIn delay={200}><Text style={S.p}>Ты в правильном месте.</Text></FadeIn>
            <FadeIn delay={320}>
              <TouchableOpacity style={[S.btn, S.btnFire]} onPress={() => go(1)}>
                <Text style={S.btnText}>Дальше →</Text>
              </TouchableOpacity>
            </FadeIn>
            <FadeIn delay={420}>
              <View style={[S.card, { marginTop: 12 }]}>
                <Text style={S.kicker}>Что дальше</Text>
                <Text style={S.p}>① Номер вместо имени{"\n"}② Специалист читает{"\n"}③ Ты получаешь ответ</Text>
                <DottedPath width={260} />
              </View>
            </FadeIn>
          </View>
        </View>
        {/* Сторис 2 */}
        <View style={{ width, paddingHorizontal: 22, paddingTop: 40 }}>
          <Text style={S.kicker}>Как это работает</Text>
          <Text style={S.display}>Пишешь.{"\n"}Получаешь номер.{"\n"}<Text style={S.displayItalic}>Тебе отвечают.</Text></Text>
          <TouchableOpacity style={[S.btn, S.btnFire]} onPress={() => go(2)}>
            <Text style={S.btnText}>Дальше →</Text>
          </TouchableOpacity>
          <View style={{ marginTop: 14, borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: C.line }}>
            <Image
              source={require("../../assets/howto.png")}
              style={{ width: "100%", height: 300 }}
              resizeMode="cover"
            />
          </View>
        </View>
        {/* Сторис 3 */}
        <View style={{ width, paddingHorizontal: 22, paddingTop: 40 }}>
          <Text style={S.kicker}>Безопасно</Text>
          <Text style={S.display}>Без имени.{"\n"}Без регистрации.{"\n"}<Text style={S.displayItalic}>Никто не узнает.</Text></Text>
          <TouchableOpacity style={[S.btn, S.btnFire]} onPress={() => nav("new")}>
            <Text style={S.btnText}>Написать письмо</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[S.btn, S.ghost]} onPress={() => nav("track")}>
            <Text style={S.ghostText}>У меня уже есть номер</Text>
          </TouchableOpacity>
          <HelpNow />
        </View>
      </ScrollView>
      <SosBar />
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, paddingBottom: 12, paddingTop: 2 }}>
        {[0, 1, 2].map((i) => (
          <TouchableOpacity key={i} onPress={() => go(i)}>
            <View style={{ width: i === page ? 26 : 8, height: 8, borderRadius: 4, backgroundColor: i === page ? C.brand : C.line }} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

/** Категории, которых нет у этого типа заявителя, — нелогичны для него. */
const HIDE_CATS: Record<string, string[]> = {
  parent: ["Конфликт с одноклассниками", "Конфликт с родителями"],
  teacher: ["Конфликт с одноклассниками"],
};

const QUIZ_ALL = {
  where: { q: "Где это происходит?", opts: ["В школе", "В сети", "Дома", "В другом месте"] },
  since: { q: "Как давно?", opts: ["Сегодня", "На этой неделе", "Уже месяц+", "Давно"] },
};
const QUIZ_WHO: Record<string, { q: string; opts: string[] }> = {
  school: { q: "Кто участвует?", opts: ["Одноклассники", "Учитель", "Родители", "Незнакомцы в сети"] },
  parent: { q: "Кто участвует?", opts: ["Ребёнок и сверстники", "Учитель", "Другие родители", "Незнакомцы в сети"] },
  teacher: { q: "Кто участвует?", opts: ["Ученики", "Коллеги", "Родители учеников", "Незнакомцы в сети"] },
};
const QUIZ_ASKED: Record<string, { q: string; opts: string[] }> = {
  school: { q: "Просил уже помощи?", opts: ["Нет", "У родителей", "У учителя", "У друзей"] },
  parent: { q: "Обращались уже куда-то?", opts: ["Нет", "В школу", "К психологу", "К близким"] },
  teacher: { q: "Обращались уже куда-то?", opts: ["Нет", "К администрации", "К психологу", "К коллегам"] },
};
function quizFor(who: string) {
  return [
    { key: "where", ...QUIZ_ALL.where },
    { key: "since", ...QUIZ_ALL.since },
    { key: "who", ...QUIZ_WHO[who] },
    { key: "asked", ...QUIZ_ASKED[who] },
  ];
}

export function New({ nav }: { nav: (s: string) => void }) {
  const [cats, setCats] = useState<{ id: number; name: string }[]>([]);
  const [step, setStep] = useState(0);
  const [who, setWho] = useState("school");
  const [cat, setCat] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  useEffect(() => { apiGet("/api/categories").then(setCats).catch(() => setCats([])); }, []);
  const ty = who === "school";
  const myQuiz = quizFor(who);
  const myCats = cats.filter((c) => !(HIDE_CATS[who] || []).includes(c.name));
  const total = 4 + myQuiz.length; // кто, о чём, письмо, 4 уточнения
  const quiz = myQuiz[step - 3];
  const catName = cats.find((c) => c.id === cat)?.name || "";
  const needText = cat === null || catName === "Не знаю, как это назвать";

  async function send() {
    if (needText && text.trim().length < 10) {
      Alert.alert("Подожди", ty ? "Ты выбрал «не знаю, как назвать» — напиши хоть пару фраз, иначе не поймём." : "Опишите ситуацию парой фраз.");
      setStep(2);
      return;
    }
    try {
      const r = await apiPost("/api/appeals", { applicant: who, category_id: cat, text, answers });
      await AsyncStorage.setItem("lastTrack", r.track);
      await AsyncStorage.setItem("lastWho", who);
      if (r.crisis) Alert.alert("Мы рядом", HELP_NOW, [
        { text: "Позвонить", onPress: callNow },
        { text: "Хорошо", style: "cancel" },
      ]);
      nav("done");
    } catch {
      Alert.alert("Подожди", ty ? "Добавь пару слов — так проще помочь." : "Добавьте пару слов.");
    }
  }

  const next = () => setStep((s) => s + 1);
  function pickWho(v: string) {
    setWho(v);
    // сбрасываем категорию и ответы, если они не подходят новому типу
    setCat((prev) => {
      const name = cats.find((c) => c.id === prev)?.name;
      return name && (HIDE_CATS[v] || []).includes(name) ? null : prev;
    });
    setAnswers({});
  }
  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <View style={S.wrap}>
      <Segments n={total + 1} i={step} />
      <ScrollView contentContainerStyle={S.pad}>
        <FadeIn key={step}>
        {step === 0 && (
          <View style={S.card}>
            <View style={S.tape} />
            <Text style={S.kicker}>1/{total + 1} · Кто пишет</Text>
            <Text style={S.display}>Ты кто?</Text>
            <Text style={S.stepLabel}>Детям</Text>
            <View style={S.chips}>
              <Chip label="Школьник" on={who === "school"} onPress={() => pickWho("school")} />
            </View>
            <Text style={S.stepLabel}>Взрослым</Text>
            <View style={S.chips}>
              <Chip label="Родитель" on={who === "parent"} onPress={() => pickWho("parent")} />
              <Chip label="Педагог" on={who === "teacher"} onPress={() => pickWho("teacher")} />
            </View>
            <TouchableOpacity style={[S.btn, S.btnFire]} onPress={next}>
              <Text style={S.btnText}>Далее →</Text>
            </TouchableOpacity>
          </View>
        )}
        {step === 1 && (
          <View style={S.card}>
            <View style={S.tape} />
            <Text style={S.kicker}>2/{total + 1} · О чём это</Text>
            <Text style={S.display}>Что случилось?</Text>
            <View style={S.chips}>
              {myCats.map((c) => <Chip key={c.id} label={c.name} on={cat === c.id} onPress={() => setCat(c.id)} />)}
            </View>
            <TouchableOpacity style={[S.btn, S.btnFire]} onPress={next}>
              <Text style={S.btnText}>Далее →</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={back}><Text style={S.small}>← Назад</Text></TouchableOpacity>
          </View>
        )}
        {step === 2 && (
          <View style={S.card}>
            <View style={S.tape} />
            <Text style={S.kicker}>3/{total + 1} · Само письмо{needText ? "" : " (можно пропустить)"}</Text>
            <Text style={S.small}>Не торопись — всё можно пропускать и исправлять.</Text>
            <Text style={S.display}>{ty ? "Расскажи." : "Опишите."}</Text>
            <TextInput style={[S.input, { minHeight: 130, textAlignVertical: "top" }]} multiline
              value={text} onChangeText={setText}
              placeholder={needText
                ? (ty ? "Без этих слов не поймём. Хоть с середины." : "Опишите ситуацию — это нужно.")
                : (ty ? "Хочешь — добавь деталей. Не хочешь — жми дальше." : "По желанию. Можно идти дальше.")} />
            <TouchableOpacity style={[S.btn, S.btnFire]} onPress={() => {
              if (needText && text.trim().length < 10) {
                Alert.alert("Подожди", ty ? "Добавь пару слов — так проще помочь." : "Добавьте пару слов.");
                return;
              }
              next();
            }}>
              <Text style={S.btnText}>Далее →</Text>
            </TouchableOpacity>
            {!needText && (
              <TouchableOpacity style={[S.btn, S.ghost]} onPress={next}>
                <Text style={S.ghostText}>Пропустить — категории хватит</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={back}><Text style={S.small}>← Назад</Text></TouchableOpacity>
          </View>
        )}
        {step >= 3 && step < 3 + myQuiz.length && quiz && (
          <View style={S.card}>
            <View style={S.tape} />
            <Text style={S.kicker}>{step + 1}/{total + 1} · Необязательно</Text>
            <Text style={S.display}>{quiz.q}</Text>
            <Text style={S.small}>Это не допрос — ответы помогут выбрать нужного человека. Всё можно пропустить.</Text>
            <View style={S.chips}>
              {quiz.opts.map((o) => (
                <Chip key={o} label={o} on={answers[quiz.key] === o}
                  onPress={() => {
                    setAnswers((a) => ({ ...a, [quiz.key]: o }));
                    setTimeout(next, 250);
                  }} />
              ))}
            </View>
            <TouchableOpacity style={[S.btn, S.ghost]} onPress={next}>
              <Text style={S.ghostText}>Пропустить</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={back}><Text style={S.small}>← Назад</Text></TouchableOpacity>
          </View>
        )}
        {step === 3 + myQuiz.length && (
          <View style={S.card}>
            <View style={S.tape} />
            <Text style={S.kicker}>{total + 1}/{total + 1} · Готово</Text>
            <Text style={S.display}>Запечатать<Text style={S.displayItalic}>?</Text></Text>
            <Text style={S.p}>Письмо уйдёт анонимно. Никто не узнает, что это ты.</Text>
            <TouchableOpacity style={[S.btn, S.btnFire]} onPress={send}>
              <Text style={S.btnText}>Отправить</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={back}><Text style={S.small}>← Назад</Text></TouchableOpacity>
            <HelpNow />
          </View>
        )}
        <TipCard step={step} />
        </FadeIn>
      </ScrollView>
      <SosBar />
    </View>
  );
}

function PerfRow() {
  return (
    <View style={[S.perfRow, { justifyContent: "center" }]}>
      {Array.from({ length: 18 }).map((_, i) => (
        <View key={i} style={S.perfDot} />
      ))}
    </View>
  );
}

export function Done({ nav }: { nav: (s: string) => void }) {
  const [track, setTrack] = useState("");
  const [ty, setTy] = useState(true);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem("lastTrack").then((t) => setTrack(t || ""));
    AsyncStorage.getItem("lastWho").then((w) => setTy(w !== "parent" && w !== "teacher"));
  }, []);
  return (
    <View style={S.wrap}>
    <ScrollView contentContainerStyle={S.pad}>
      <FadeIn>
      <View style={{ alignItems: "center", marginVertical: 10 }}>
        <WaxSeal size={76} />
      </View>
      <View style={S.card}>
        <View style={S.tape} />
        <Text style={S.display}>{ty ? "Тебя услышали." : "Вас услышали."}</Text>
        <Text style={S.p}>
          {ty
            ? "Письмо уже у живого человека. Можешь выдохнуть — дальше мы сами."
            : "Письмо уже у живого человека. Дальше мы позаботимся сами."}
        </Text>
        <View style={S.ticket}>
          <View style={{ padding: 18 }}>
            <Text style={S.ticketSub}>ТВОЁ СЕКРЕТНОЕ СЛОВО</Text>
            <Text style={S.ticketNum}>{shown ? track : "•••• ••••"}</Text>
            <PerfRow />
            <Text style={S.ticketSub}>
              {ty
                ? "Мы сохранили его на этом телефоне — запоминать ничего не надо"
                : "Мы сохранили его на этом телефоне — запоминать ничего не нужно"}
            </Text>
            <TouchableOpacity onPress={() => setShown((v) => !v)}>
              <Text style={[S.ticketSub, { textDecorationLine: "underline", marginTop: 8 }]}>
                {shown ? "Спрятать" : ty ? "Показать — нужно для другого телефона" : "Показать — нужно для другого телефона"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity style={[S.btn, S.btnFire]} onPress={() => nav("track")}>
          <Text style={S.btnText}>{ty ? "Как там моё письмо?" : "Как там моё письмо?"}</Text>
        </TouchableOpacity>
        <HelpNow />
      </View>
      </FadeIn>
    </ScrollView>
    <SosBar />
    </View>
  );
}

const ORDER = ["new", "assigned", "in_work", "need_info", "answer_ready", "done"];
const NAMES: Record<string, string> = {
  new: "Получено", assigned: "У специалиста", in_work: "Разбираемся",
  need_info: "Ждём твой ответ", answer_ready: "Готово", done: "Завершено",
};

type TrackData = {
  status: string; human: string; returns_left: number;
  messages: { author: string; text: string }[];
  answers: Record<string, string>;
  files: string[];
};

async function uploadFiles(number: string, onDone: () => void) {
  try {
    const docs = await pick({ type: [types.images], allowMultiSelection: true });
    const form = new FormData();
    docs.slice(0, 5).forEach((d, i) => {
      form.append("files", {
        uri: d.uri, type: d.type || "image/jpeg", name: d.name || `shot${i}.jpg`,
      } as unknown as Blob);
    });
    const r = await fetch(`${API_URL}/api/appeals/${encodeURIComponent(number)}/files`, {
      method: "POST", body: form,
    });
    if (!r.ok) throw new Error(await r.text());
    onDone();
  } catch (e) {
    if (String(e).includes("cancel")) return;
    Alert.alert("Не вышло", "Файл до 10 МБ.");
  }
}

export function Track() {
  const [num, setNum] = useState("");
  const [data, setData] = useState<TrackData | null>(null);
  const [draft, setDraft] = useState("");
  useEffect(() => { AsyncStorage.getItem("lastTrack").then((t) => { if (t) setNum(t); }); }, []);
  async function load() {
    try { setData(await apiGet(`/api/appeals/${encodeURIComponent(num)}`)); }
    catch { Alert.alert("Нет такого", "Проверь символы в номере."); }
  }
  async function sendMsg() {
    if (!draft.trim()) return;
    await apiPost(`/api/appeals/${encodeURIComponent(num)}/messages`, { text: draft });
    setDraft(""); load();
  }
  async function resolve(helped: boolean) {
    await apiPost(`/api/appeals/${encodeURIComponent(num)}/resolve`, { helped });
    load();
  }
  const idx = data ? ORDER.indexOf(data.status) : -1;
  return (
    <View style={S.wrap}>
    <ScrollView contentContainerStyle={S.pad}>
      {!data && (
        <View style={S.card}>
          <View style={S.tape} />
          <Text style={S.display}>Твой номер?</Text>
          <TextInput style={[S.input, S.mono]} value={num} onChangeText={setNum}
            placeholder="ОТК-XXXX-XXXX" autoCapitalize="characters" />
          <TouchableOpacity style={[S.btn, S.btnFire]} onPress={load}>
            <Text style={S.btnText}>Показать путь →</Text>
          </TouchableOpacity>
          <HelpNow />
        </View>
      )}
      {data && (
        <FadeIn key={data.status}>
        <View style={S.card}>
          <Text style={S.kicker}>Сейчас</Text>
          <Text style={S.display}>{data.human}</Text>
          <View style={{ flexDirection: "row", marginTop: 6 }}>
            <Journey count={ORDER.length} current={Math.max(idx, 0)} />
            <View style={{ flex: 1, justifyContent: "space-around", paddingVertical: 4 }}>
              {ORDER.map((s, i) => (
                <Text key={s} style={[S.stepText, { fontWeight: i === idx ? "700" : "400", color: i === idx ? C.brandDeep : C.ink }]}>
                  {NAMES[s]}
                </Text>
              ))}
            </View>
          </View>
          <Squiggle width={260} />
          {["new", "assigned", "in_work"].includes(data.status) && <BreathCard />}
          {data.messages.map((m, i) => (
            <View key={i} style={[S.msg, m.author === "expert" ? S.msgExpert : S.msgMine]}>
              <Text style={S.p}>{m.text}</Text>
            </View>
          ))}
          <TextInput style={S.input} value={draft} onChangeText={setDraft} placeholder="Написать…" />
          <TouchableOpacity style={[S.btn, S.ghost]} onPress={sendMsg}>
            <Text style={S.ghostText}>Отправить</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[S.btn, S.ghost]} onPress={() => uploadFiles(num, load)}>
            <Text style={S.ghostText}>+ Скриншот</Text>
          </TouchableOpacity>
          {data.status === "answer_ready" && (
            <>
              <TouchableOpacity style={[S.btn, S.btnFire]} onPress={() => resolve(true)}>
                <Text style={S.btnText}>Помогло</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[S.btn, S.warn]} onPress={() => resolve(false)}>
                <Text style={S.warnText}>Не помогло</Text>
              </TouchableOpacity>
            </>
          )}
          <HelpNow />
        </View>
        </FadeIn>
      )}
    </ScrollView>
    {data && <SosBar />}
    </View>
  );
}
