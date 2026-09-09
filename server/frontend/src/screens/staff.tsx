import { useEffect, useState } from "react";
import { api } from "../api";

export function Login({ nav }: { nav: (h: string) => void }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  async function go() {
    try {
      const r = await api.post("/api/login", { login, password });
      localStorage.setItem("token", r.token);
      localStorage.setItem("role", r.role);
      nav(r.role === "operator" ? "#/operator" : r.role === "expert" ? "#/expert" : "#/admin");
    } catch { setErr("Неверный логин или пароль"); }
  }
  return (
    <div className="card">
      <div className="tape" />
      <h2>Вход для команды</h2>
      <input value={login} onChange={(e) => setLogin(e.target.value)} placeholder="Логин" />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Пароль" />
      {err && <p className="small">{err}</p>}
      <button className="btn" onClick={go}>Войти</button>
      <p className="small">Демо: operator1/oper123, expert_psy/exp123, admin/admin123</p>
    </div>
  );
}

type Appeal = {
  id: number; text: string; answers: Record<string, string>; files: string[];
  status: string; priority: string; crisis: boolean; applicant: string; assignee?: string;
};

function Answers({ a }: { a: Record<string, string> }) {
  const vals = Object.values(a || {}).filter(Boolean);
  if (!vals.length) return null;
  return <p className="small">Уточнения: {vals.join(" · ")}</p>;
}

export function Operator() {
  const [rows, setRows] = useState<Appeal[]>([]);
  const [open, setOpen] = useState<Appeal | null>(null);
  const [suggest, setSuggest] = useState<{ group: string | null; free: { id: number; login: string; load: number }[] }>({ group: null, free: [] });
  const [prio, setPrio] = useState("standard");
  function load() { api.staffGet("/api/operator/queue").then(setRows).catch(() => {}); }
  useEffect(load, []);
  async function openCard(a: Appeal) {
    setOpen(a); setPrio(a.priority);
    try { setSuggest(await api.staffGet(`/api/operator/suggest/${a.id}`)); }
    catch { setSuggest({ group: null, free: [] }); }
  }
  async function assign(expert_id: number) {
    if (!open) return;
    await api.staffPost(`/api/operator/appeals/${open.id}/assign`, { expert_id, priority: prio });
    setOpen(null); load();
  }
  async function reject(spam: boolean) {
    if (!open) return;
    const reason = prompt("Причина:") || "";
    await api.staffPost(`/api/operator/appeals/${open.id}/close`, { spam, reason });
    setOpen(null); load();
  }
  return (
    <div>
      <div className="card">
        <h2>Новые обращения</h2>
        <p className="small">Срочные и кризисные — сверху. Переписку с экспертом ты не видишь.</p>
        {rows.filter((r) => r.crisis).map((a) => (
          <div key={a.id} className="crisis">
            <span className="badge urgent">кризис</span>
            <p>{a.text.slice(0, 160)}</p>
            <button className="btn" onClick={() => openCard(a)}>Открыть</button>
          </div>
        ))}
        {rows.filter((r) => !r.crisis).map((a) => (
          <div key={a.id} className="card" style={{ border: "1px solid #D7E0EE" }}>
            <p>{a.text.slice(0, 160)}</p>
            <button className="btn ghost" onClick={() => openCard(a)}>Открыть</button>
          </div>
        ))}
        {!rows.length && <p className="small">Очередь пуста — всё разобрано.</p>}
      </div>
      {open && (
        <div className="card">
          <h2>Обращение #{open.id}</h2>
          <p>{open.text}</p>
          <Answers a={open.answers} />
          {!!open.files?.length && <p className="small">Вложений: {open.files.length}</p>}
          <p className="small">Подсказка системы: группа «{suggest.group || "—"}»</p>
          {suggest.free.map((f) => (
            <button key={f.id} className="btn ghost" onClick={() => assign(f.id)}>
              Назначить {f.login} (нагрузка {f.load})
            </button>
          ))}
          <select value={prio} onChange={(e) => setPrio(e.target.value)}>
            <option value="urgent">Срочно</option>
            <option value="standard">Стандарт</option>
            <option value="low">Низкий</option>
          </select>
          <button className="btn warn" onClick={() => reject(true)}>Отклонить как спам</button>
          <button className="btn ghost" onClick={() => setOpen(null)}>Назад</button>
        </div>
      )}
    </div>
  );
}

export function Expert() {
  const [rows, setRows] = useState<{ id: number; status: string; priority: string; text: string }[]>([]);
  const [card, setCard] = useState<{
    id: number; text: string; status: string;
    answers: Record<string, string>; files: string[];
    messages: { author: string; text: string }[]; notes: { text: string }[];
  } | null>(null);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState("");
  function load() { api.staffGet("/api/expert/mine").then(setRows).catch(() => {}); }
  useEffect(load, []);
  async function open(id: number) {
    setCard(await api.staffGet(`/api/expert/appeals/${id}`));
  }
  async function send(question: boolean) {
    if (!card || !draft.trim()) return;
    await api.staffPost(`/api/expert/appeals/${card.id}/message`, { text: draft, question });
    setDraft(""); open(card.id);
  }
  async function saveNote() {
    if (!card || !note.trim()) return;
    await api.staffPost(`/api/expert/appeals/${card.id}/note`, { text: note });
    setNote(""); open(card.id);
  }
  async function ready() {
    if (!card) return;
    const text = prompt("Рекомендации:") || "";
    await api.staffPost(`/api/expert/appeals/${card.id}/ready`, { text });
    setCard(null); load();
  }
  async function transfer() {
    if (!card) return;
    await api.staffPost(`/api/expert/appeals/${card.id}/transfer`, { reason: "нужен коллега другого профиля" });
    alert("Запрошено. Оператор подтвердит передачу.");
  }
  if (!card) {
    return (
      <div className="card">
        <h2>Мои обращения</h2>
        {rows.map((a) => (
          <div key={a.id} className="card" style={{ border: "1px solid #D7E0EE" }}>
            <span className={"badge" + (a.priority === "urgent" ? " urgent" : "")}>{a.priority}</span>
            <p>{a.text}</p>
            <button className="btn ghost" onClick={() => open(a.id)}>Открыть</button>
          </div>
        ))}
        {!rows.length && <p className="small">Ничего не назначено.</p>}
      </div>
    );
  }
  return (
    <div className="card">
      <h2>Обращение #{card.id}</h2>
      <p>{card.text}</p>
      {!!card.answers && !!Object.values(card.answers).filter(Boolean).length && (
        <p className="small">Уточнения: {Object.values(card.answers).filter(Boolean).join(" · ")}</p>
      )}
      {!!card.files?.length && <p className="small">Вложений: {card.files.length}</p>}
      {card.messages.map((m, i) => (
        <div key={i} className={"msg " + (m.author === "expert" ? "expert" : "applicant")}>{m.text}</div>
      ))}
      <textarea rows={2} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ответ заявителю…" />
      <button className="btn" onClick={() => send(false)}>Ответить</button>
      <button className="btn ghost" onClick={() => send(true)}>Задать уточняющий вопрос</button>
      <h2>Заметки (заявитель не видит)</h2>
      {card.notes.map((n, i) => <p key={i} className="small">• {n.text}</p>)}
      <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Внутренняя заметка…" />
      <button className="btn ghost" onClick={saveNote}>Сохранить заметку</button>
      <button className="btn" onClick={ready}>Рекомендации готовы</button>
      <button className="btn ghost" onClick={transfer}>Запросить передачу коллеге</button>
      <button className="btn ghost" onClick={() => { setCard(null); load(); }}>Назад</button>
    </div>
  );
}

export function Admin() {
  const [stats, setStats] = useState<{ total: number; urgent_share: number; returned_share: number } | null>(null);
  const [cat, setCat] = useState("");
  useEffect(() => { api.staffGet("/api/stats").then(setStats).catch(() => {}); }, []);
  async function addCat() {
    if (!cat.trim()) return;
    await api.staffPost("/api/admin/categories", { name: cat, group: "general" });
    setCat("");
    alert("Категория добавлена");
  }
  return (
    <div>
      <div className="card">
        <h2>Аналитика</h2>
        {stats && (
          <table className="grid">
            <tbody>
              <tr><td>Всего обращений</td><td>{stats.total}</td></tr>
              <tr><td>Доля срочных</td><td>{Math.round(stats.urgent_share * 100)}%</td></tr>
              <tr><td>Доля возвратов</td><td>{Math.round(stats.returned_share * 100)}%</td></tr>
            </tbody>
          </table>
        )}
        <a href="/api/export.csv">Выгрузить CSV (без текстов)</a>
      </div>
      <div className="card">
        <h2>Новая категория</h2>
        <input value={cat} onChange={(e) => setCat(e.target.value)} placeholder="Название" />
        <button className="btn" onClick={addCat}>Добавить</button>
      </div>
    </div>
  );
}
