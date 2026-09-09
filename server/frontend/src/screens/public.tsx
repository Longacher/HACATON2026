import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { NightLetter, WaxSeal } from "../art";

export const HELP_NOW = "Детский телефон доверия: 8-800-2000-122 — бесплатно, круглосуточно. Там живые люди.";

function HelpNow() {
  return (
    <button className="helpnow" onClick={() => alert(HELP_NOW)}>
      Нужна помощь прямо сейчас?
    </button>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <button className={"chip" + (on ? " on" : "")} onClick={onPress}>
      {label}
    </button>
  );
}

export function Home({ nav }: { nav: (h: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const go = (p: number) => {
    setPage(p);
    ref.current?.querySelectorAll(".story")[p]?.scrollIntoView({ behavior: "smooth", inline: "start" });
  };
  return (
    <div>
      <div className="hero">
        <img src="hug.png" alt="Объятие — ты не один" style={{ width: "100%", display: "block", borderRadius: 18 }} />
      </div>
      <div className="stories" ref={ref}>
        <div className="story">
          <div style={{ padding: "10px 22px" }}>
            <div className="display">Ты не один.<br /><em>Мы рядом — по-настоящему.</em></div>
            <p>Ты в правильном месте.</p>
            <button className="btn" onClick={() => go(1)}>Дальше →</button>
          </div>
        </div>
        <div className="story">
          <div style={{ padding: "40px 22px" }}>
            <div className="kicker">Как это работает</div>
            <div className="display">Пишешь.<br />Получаешь номер.<br /><em>Тебе отвечают.</em></div>
            <button className="btn" onClick={() => go(2)}>Дальше →</button>
            <div style={{ marginTop: 14, borderRadius: 24, overflow: "hidden", border: "1px solid var(--line)" }}>
              <img src="howto.png" alt="Специалист отвечает на заявку" style={{ width: "100%", display: "block" }} />
            </div>
          </div>
        </div>
        <div className="story">
          <div style={{ padding: "40px 22px" }}>
            <div className="kicker">Безопасно</div>
            <div className="display">Без имени.<br />Без регистрации.<br /><em>Никто не узнает.</em></div>
            <button className="btn" onClick={() => nav("#/new")}>Написать письмо</button>
            <button className="btn ghost" onClick={() => nav("#/track")}>У меня уже есть номер</button>
            <HelpNow />
          </div>
        </div>
      </div>
      <div className="dots">
        {[0, 1, 2].map((i) => (
          <i key={i} className={i === page ? "on" : ""} onClick={() => go(i)} />
        ))}
      </div>
    </div>
  );
}

const HIDE_CATS: Record<string, string[]> = {
  parent: ["Конфликт с одноклассниками", "Конфликт с родителями"],
  teacher: ["Конфликт с одноклассниками"],
};

const QUIZ_ALL = {
  where: { q: "Где это происходит?", opts: ["В школе", "В сети", "Дома", "В другом месте"] },
  since: { q: "Как давно?", opts: ["Сегодня", "На этой неделе", "Уже месяц+", "Давно"] },
};
const QUIZ_WHO: Record<string, { q: string; opts: string[] }> = {
  school: { q: "Кто участвует?", opts: ["Одноклассники", "Учитель", "Родители", "Незнакомцы"] },
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

export function New({ nav }: { nav: (h: string) => void }) {
  const [cats, setCats] = useState<{ id: number; name: string }[]>([]);
  const [step, setStep] = useState(0);
  const [who, setWho] = useState("school");
  const [cat, setCat] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  useEffect(() => {
    api.get("/api/categories").then(setCats).catch(() => setCats([]));
  }, []);
  const ty = who === "school";
  const myQuiz = quizFor(who);
  const myCats = cats.filter((c) => !(HIDE_CATS[who] || []).includes(c.name));
  const total = 4 + myQuiz.length;
  const quiz = myQuiz[step - 3];
  const catName = cats.find((c) => c.id === cat)?.name || "";
  const needText = cat === null || catName === "Не знаю, как это назвать";
  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => Math.max(0, s - 1));
  function pickWho(v: string) {
    setWho(v);
    setCat((prev) => {
      const name = cats.find((c) => c.id === prev)?.name;
      return name && (HIDE_CATS[v] || []).includes(name) ? null : prev;
    });
    setAnswers({});
  }

  async function send() {
    if (needText && text.trim().length < 10) {
      alert(ty ? "Ты выбрал «не знаю, как назвать» — напиши хоть пару фраз." : "Опишите ситуацию парой фраз.");
      setStep(2);
      return;
    }
    try {
      const r = await api.post("/api/appeals", { applicant: who, category_id: cat, text, answers });
      sessionStorage.setItem("lastTrack", r.track);
      sessionStorage.setItem("lastWho", who);
      if (r.crisis) alert(HELP_NOW);
      nav("#/done");
    } catch (e) {
      alert(ty ? "Добавь пару слов — так проще помочь." : "Добавьте пару слов.");
    }
  }

  return (
    <div>
      <div className="segments">
        {Array.from({ length: total + 1 }).map((_, i) => (
          <i key={i} className={i <= step ? "done" : ""} />
        ))}
      </div>
      {step === 0 && (
        <div className="card">
          <div className="tape" />
          <div className="kicker">1/{total + 1} · Кто пишет</div>
          <div className="display">Ты кто?</div>
          <div className="kicker">Детям</div>
          <div className="chips">
            <Chip label="Школьник" on={who === "school"} onPress={() => pickWho("school")} />
          </div>
          <div className="kicker">Взрослым</div>
          <div className="chips">
            <Chip label="Родитель" on={who === "parent"} onPress={() => pickWho("parent")} />
            <Chip label="Педагог" on={who === "teacher"} onPress={() => pickWho("teacher")} />
          </div>
          <button className="btn" onClick={next}>Далее →</button>
        </div>
      )}
      {step === 1 && (
        <div className="card">
          <div className="tape" />
          <div className="kicker">2/{total + 1} · О чём это</div>
          <div className="display">Что случилось?</div>
          <div className="chips">
            {myCats.map((c) => (
              <Chip key={c.id} label={c.name} on={cat === c.id} onPress={() => setCat(c.id)} />
            ))}
          </div>
          <button className="btn" onClick={next}>Далее →</button>
          <button className="btn ghost" onClick={back}>← Назад</button>
        </div>
      )}
      {step === 2 && (
        <div className="card">
          <div className="tape" />
          <div className="kicker">3/{total + 1} · Само письмо{needText ? "" : " (можно пропустить)"}</div>
          <div className="display">{ty ? "Расскажи." : "Опишите."}</div>
          <textarea
            rows={5} value={text} onChange={(e) => setText(e.target.value)}
            placeholder={needText ? "Без этих слов не поймём. Хоть с середины." : "По желанию. Можно идти дальше."}
          />
          <button
            className="btn"
            onClick={() => {
              if (needText && text.trim().length < 10) {
                alert(ty ? "Добавь пару слов." : "Добавьте пару слов.");
                return;
              }
              next();
            }}
          >
            Далее →
          </button>
          {!needText && <button className="btn ghost" onClick={next}>Пропустить — категории хватит</button>}
          <button className="btn ghost" onClick={back}>← Назад</button>
        </div>
      )}
      {step >= 3 && step < 3 + myQuiz.length && quiz && (
        <div className="card">
          <div className="tape" />
          <div className="kicker">{step + 1}/{total + 1} · Необязательно</div>
          <div className="display">{quiz.q}</div>
          <p className="small">Это не допрос — ответы помогут выбрать нужного человека. Всё можно пропустить.</p>
          <div className="chips">
            {quiz.opts.map((o) => (
              <Chip
                key={o} label={o} on={answers[quiz.key] === o}
                onPress={() => {
                  setAnswers((a) => ({ ...a, [quiz.key]: o }));
                  setTimeout(next, 250);
                }}
              />
            ))}
          </div>
          <button className="btn ghost" onClick={next}>Пропустить</button>
          <button className="btn ghost" onClick={back}>← Назад</button>
        </div>
      )}
      {step === 3 + myQuiz.length && (
        <div className="card">
          <div className="tape" />
          <div className="kicker">{total + 1}/{total + 1} · Готово</div>
          <div className="display">Запечатать?</div>
          <p>Письмо уйдёт анонимно. {ty ? "Никто не узнает, что это ты." : "Никто не узнает, что это вы."}</p>
          <button className="btn" onClick={send}>Отправить</button>
          <button className="btn ghost" onClick={back}>← Назад</button>
          <HelpNow />
        </div>
      )}
    </div>
  );
}

export function Done({ nav }: { nav: (h: string) => void }) {
  const track = sessionStorage.getItem("lastTrack") || "";
  const ty = (sessionStorage.getItem("lastWho") || "school") === "school";
  const [shown, setShown] = useState(false);
  return (
    <div className="card" style={{ textAlign: "center" }}>
      <div className="tape" />
      <div style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>
        <WaxSeal />
      </div>
      <div className="display">{ty ? "Тебя услышали." : "Вас услышали."}</div>
      <p>{ty ? "Письмо уже у живого человека. Можешь выдохнуть — дальше мы сами." : "Письмо уже у живого человека. Дальше мы позаботимся сами."}</p>
      <div className="ticket">
        <div>
          <div className="sub">ТВОЁ СЕКРЕТНОЕ СЛОВО</div>
          <div className="num">{shown ? track : "•••• ••••"}</div>
          <div className="perf">{Array.from({ length: 14 }).map((_, i) => <i key={i} />)}</div>
          <div className="sub">{ty ? "Мы сохранили его в этом браузере — запоминать ничего не надо" : "Мы сохранили его в этом браузере — запоминать ничего не нужно"}</div>
          <button className="helpnow" style={{ color: "#BDD0F5" }} onClick={() => setShown((v) => !v)}>
            {shown ? "Спрятать" : "Показать — нужно для другого телефона"}
          </button>
        </div>
      </div>
      <button className="btn" onClick={() => nav("#/track")}>Как там моё письмо?</button>
      <HelpNow />
    </div>
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
};

export function Track() {
  const [num, setNum] = useState(sessionStorage.getItem("lastTrack") || "");
  const [data, setData] = useState<TrackData | null>(null);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState("");
  async function load() {
    setErr("");
    try {
      setData(await api.get(`/api/appeals/${encodeURIComponent(num)}`));
    } catch {
      setErr("Такой номер не найден. Проверь символы.");
    }
  }
  async function sendMsg() {
    if (!draft.trim()) return;
    await api.post(`/api/appeals/${encodeURIComponent(num)}/messages`, { text: draft });
    setDraft("");
    load();
  }
  async function resolve(helped: boolean) {
    const reason = helped ? "" : prompt("Чего не хватило?") || "";
    await api.post(`/api/appeals/${encodeURIComponent(num)}/resolve`, { helped, reason });
    load();
  }
  const idx = data ? ORDER.indexOf(data.status) : -1;
  return (
    <div>
      {!data && (
        <div className="card">
          <div className="tape" />
          <div className="display">Твой номер?</div>
          <input value={num} onChange={(e) => setNum(e.target.value)} placeholder="ОТК-XXXX-XXXX" />
          <button className="btn" onClick={load}>Показать путь →</button>
          {err && <p className="small">{err}</p>}
          <HelpNow />
        </div>
      )}
      {data && (
        <div className="card">
          <div className="kicker">Сейчас</div>
          <h2 style={{ fontSize: 20 }}>{data.human}</h2>
          <ul className="steps">
            {ORDER.map((s, i) => (
              <li key={s} className={i < idx ? "done" : i === idx ? "now" : ""}>{NAMES[s]}</li>
            ))}
          </ul>
          {data.messages.map((m, i) => (
            <div key={i} className={"msg " + (m.author === "expert" ? "expert" : "applicant")}>
              {m.text}
            </div>
          ))}
          <textarea rows={2} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Написать…" />
          <button className="btn ghost" onClick={sendMsg}>Отправить</button>
          {data.status === "answer_ready" && (
            <>
              <button className="btn" onClick={() => resolve(true)}>Помогло</button>
              <button className="btn warn" onClick={() => resolve(false)}>Не помогло</button>
            </>
          )}
          <HelpNow />
        </div>
      )}
    </div>
  );
}
