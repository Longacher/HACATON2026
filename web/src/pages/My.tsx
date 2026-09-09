import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, getToken } from "../api/client";
import type { ExpertAppeal } from "../api/types";
import Shell from "../components/Shell";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../hooks/useAuth";

type Msg = { author_type: string; text: string; created_at: string };

export default function My() {
  const { push } = useToast();
  const { role } = useAuth();
  const [list, setList] = useState<ExpertAppeal[]>([]);
  const [denied, setDenied] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState("all");
  const [fPriority, setFPriority] = useState("");
  const [fCategory, setFCategory] = useState("");
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  const [sending, setSending] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const thread = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const qs = new URLSearchParams();
      if (fPriority) qs.set("priority", fPriority);
      if (fCategory) qs.set("category_id", fCategory);
      const q = qs.toString() ? `?${qs}` : "";
      setList(await api.get<ExpertAppeal[]>(`/expert/appeals${q}`)); setDenied(false);
      try { setCats(await api.get("/categories")); } catch {}
    }
    catch (e: any) { if (e instanceof ApiError && e.status === 403) setDenied(true); else push(e.message, "err"); }
  }, [push, fPriority, fCategory]);
  useEffect(() => { load(); const t = setInterval(load, 20000); return () => { clearInterval(t); ws.current?.close(); }; }, [load]);
  useEffect(() => { thread.current?.scrollTo({ top: 99999, behavior: "smooth" }); }, [detail?.messages?.length]);

  const [viewers, setViewers] = useState<any[]>([]);
  const [typing, setTyping] = useState<string | null>(null);
  const typingTimer = useRef<any>(null);

  const myId = (() => { try { return JSON.parse(atob((getToken() || "").split(".")[1])).sub; } catch { return null; } })();
  const others = viewers.filter((v) => v.user_id !== myId);

  const open = async (id: string) => {
    const d = await api.get<any>(`/expert/appeals/${id}`);
    setDetail(d);
    setViewers(d.viewers || []);
    ws.current?.close();
    const token = getToken();
    try {
      const s = new WebSocket(`ws://${location.host}/api/v1/ws/specialist/appeals/${id}${token ? `?token=${token}` : ""}`);
      s.onmessage = (e) => {
        try {
          const m = JSON.parse(e.data);
          if (m.event === "message") setDetail((p: any) => p ? { ...p, messages: [...p.messages, m] } : p);
          else if (m.event === "presence") setViewers(m.viewers || []);
          else if (m.event === "typing" && m.user_id !== myId) {
            setTyping(m.name || "Коллега");
            clearTimeout(typingTimer.current);
            typingTimer.current = setTimeout(() => setTyping(null), 3000);
          }
        } catch {}
      };
      ws.current = s;
    } catch {}
  };
  const onDraft = (v: string) => {
    setDraft(v);
    try { ws.current?.readyState === 1 && ws.current.send(JSON.stringify({ event: "typing" })); } catch {}
  };
  const act = async (action: string, body: any = {}) => {
    if (!detail) return;
    await api.post(`/expert/appeals/${detail.id}/${action}`, body);
    setDetail(await api.get(`/expert/appeals/${detail.id}`)); load();
  };
  const send = async () => {
    if (!draft.trim() || sending || !detail) return;
    if (others.length > 0 && !window.confirm(`${others.map((o) => o.name).join(", ")} тоже в карточке. Отправить всё равно?`)) return;
    setSending(true);
    try { await act("message", { text: draft.trim() }); setDraft(""); push("Отправлено тепло 💚", "ok"); }
    catch (e: any) { push(e.message, "err"); } finally { setSending(false); }
  };

  const shown = list.filter((a) => filter === "all" ? true : filter === "crisis" ? a.is_crisis : filter === "mine" ? a.is_responsible : a.status === filter);

  if (denied) return (
    <Shell><div className="card" style={{ padding: 40, textAlign: "center" }}>
      <div style={{ fontSize: 44 }}>💚</div><h2 className="serif">Нужна роль эксперта</h2>
      <p style={{ color: "var(--muted)" }}>Вы — «{role}». Добавьте <b>psy1 / psy123</b> и переключайтесь в 1 клик.</p>
      <a className="btn-primary" style={{ textDecoration: "none", display: "inline-block", marginTop: 8 }} href="/login?add=1">＋ Добавить psy1</a>
    </div></Shell>
  );

  return (
    <Shell>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
        <h1 className="serif" style={{ margin: 0, fontSize: 24 }}>Мои обращения</h1>
        <span className="badge" style={{ background: "var(--sage-soft)", color: "var(--teal-deep)" }}>{list.length}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {[["all", "Все"], ["mine", "Я ответственный"], ["crisis", "🆘 Кризис"], ["need_clarification", "Уточнения"], ["answer_ready", "Готовы"]].map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} className={filter === k ? "btn-primary" : "btn-ghost"} style={filter === k ? { padding: "7px 12px", fontSize: 13 } : { fontSize: 13 }}>{l}</button>
          ))}
          <select className="select" style={{ width: 130, fontSize: 13 }} value={fPriority} onChange={(e) => setFPriority(e.target.value)}>
            <option value="">Приоритет…</option><option value="urgent">🔥 Срочно</option><option value="standard">Стандарт</option><option value="low">Низкий</option>
          </select>
          <select className="select" style={{ width: 170, fontSize: 13 }} value={fCategory} onChange={(e) => setFCategory(e.target.value)}>
            <option value="">Категория…</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16, alignItems: "start" }}>
        <div className="stagger" style={{ maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
          {shown.map((a) => (
            <div key={a.id} onClick={() => open(a.id)} className={`queue-item ${detail?.id === a.id ? "selected" : ""} ${a.is_crisis ? "crisis" : ""}`}>
              <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>{a.text || "(без текста)"}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center" }}>
                <span className="badge" style={{ background: "var(--teal-soft)", color: "var(--teal-deep)" }}>{a.status}</span>
                <span style={{ marginLeft: "auto", fontSize: 11.5, color: a.is_responsible ? "var(--ok)" : "var(--muted)", fontWeight: 700 }}>{a.is_responsible ? "💚 мой" : "🤝 соисп."}</span>
              </div>
            </div>
          ))}
          {shown.length === 0 && <div className="card" style={{ padding: 26, textAlign: "center", color: "var(--muted)" }}>🌱 Пока тихо</div>}
        </div>
        <div>
          {!detail && <div className="card" style={{ padding: 50, textAlign: "center", color: "var(--muted)" }}>💬 Выберите диалог слева</div>}
          {detail && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 14 }}>
              <section className="card" style={{ display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 480 }}>
                <div ref={thread} className="chat-thread" style={{ flex: 1, overflowY: "auto", padding: 16, background: "linear-gradient(180deg,#faf7f0,#eef3ee)", maxHeight: 520 }}>
                  {(detail.messages || []).map((m: Msg, i: number) => {
                    const mine = m.author_type === "specialist";
                    return <div key={i} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", marginBottom: 10 }}>
                      <div className="chat-bubble" style={mine ? { background: "linear-gradient(135deg,#2e7d7b,#3f9d8e)", color: "#fff", padding: "10px 14px", borderRadius: 16, borderBottomRightRadius: 6, fontSize: 14 } : { background: "#fff", border: "1px solid var(--line)", padding: "10px 14px", borderRadius: 16, borderBottomLeftRadius: 6, fontSize: 14 }}>{m.text}</div>
                    </div>;
                  })}
                </div>
                {(others.length > 0 || typing) && (
                  <div style={{ padding: "8px 14px", fontSize: 12.5, color: "#7a5b06", background: "var(--warn-bg)", borderTop: "1px solid #ead9a8" }}>
                    {others.length > 0 && <div>👀 В карточке: {others.map((o) => o.name).join(", ")} — договоритесь, кто отвечает</div>}
                    {typing && <div style={{ marginTop: 2 }}>✍️ {typing} пишет…</div>}
                  </div>
                )}
                <div style={{ padding: 10, display: "flex", gap: 8, borderTop: "1px solid var(--line)" }}>
                  <textarea className="textarea" rows={1} value={draft} onChange={(e) => onDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Тепло и просто… (Enter — отправить)" style={{ resize: "none" }} />
                  <button className="btn-primary" onClick={send} disabled={sending || !draft.trim()}>➤</button>
                </div>
              </section>
              <aside style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="card" style={{ padding: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)" }}>📄 ИСТОРИЯ</div>
                  <p style={{ fontSize: 13.5, lineHeight: 1.6 }}>{detail.text}</p>
                  {(detail.attachments?.length > 0) && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
                      {detail.attachments.map((f: any, i: number) => (
                        <a key={i} href={f.url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "var(--teal-deep)", fontWeight: 600 }}>📎 {f.filename} · {Math.round((f.size_bytes || 0) / 1024)} КБ</a>
                      ))}
                    </div>
                  )}
                  {(detail.co_executors?.length > 0 || (detail.transfers || []).length > 0) && (
                    <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 8, borderTop: "1px solid var(--line)", paddingTop: 8 }}>
                      <div style={{ fontWeight: 800, marginBottom: 4 }}>👥 УЧАСТНИКИ</div>
                      {(detail.co_executors || []).map((c: any) => <div key={c.user_id}>🤝 {c.display_name || "Соисполнитель"}</div>)}
                      {(detail.transfers || []).map((t: any, i: number) => <div key={i}>🔀 {t.resolved ? "Передано" : "Передача на рассмотрении"}: «{t.reason}»</div>)}
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                    {detail.status === "assigned" && (<button className="btn-primary" onClick={() => act("take")}>🌱 Взять в работу</button>)}
                    <button className="btn-ghost" onClick={() => { const t = prompt("Вопрос заявителю:"); if (t) act("status", { to_status: "need_clarification", comment: t }); }}>❓ Уточнить</button>
                    <button className="btn-ghost" style={{ background: "var(--ok-bg)", color: "var(--ok)", fontWeight: 700 }} onClick={() => { const t = prompt("Рекомендации:"); if (t) act("status", { to_status: "answer_ready", comment: t }); }}>💚 Ответ готов</button>
                    <button className="btn-ghost" style={{ color: "var(--crisis)" }} onClick={() => { const r = prompt("Причина передачи:"); if (r) act("request-transfer", { reason: r }); }}>Передать</button>
                    <button className="btn-ghost" onClick={async () => {
                      const list = await api.get<any[]>("/expert/colleagues").catch(() => []);
                      if (!list.length) { push("Нет доступных коллег", "err"); return; }
                      const pick = prompt(`Кого подключить соисполнителем?\n${list.map((c: any, i: number) => `${i + 1}. ${c.display_name}`).join("\n")}\n\nВведи номер:`);
                      const idx = Number(pick) - 1;
                      if (list[idx]) { await act("co-executor", { expert_id: list[idx].id }); push(`${list[idx].display_name} подключён 🤝`, "ok"); }
                    }}>🤝 Соисполнитель</button>
                  </div>
                  {(detail.co_executors?.length > 0 || (detail.transfers || []).some((t: any) => !t.resolved)) && (
                    <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 8 }}>
                      {(detail.co_executors?.length > 0) && <div>🤝 Соисполнителей: {detail.co_executors.length}</div>}
                      {(detail.transfers || []).filter((t: any) => !t.resolved).map((t: any, i: number) => <div key={i}>🔀 Передача на рассмотрении: «{t.reason}»</div>)}
                    </div>
                  )}
                </div>
                <div className="card" style={{ padding: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "var(--muted)" }}>🔒 ЗАМЕТКИ · НЕ ВИДНО ЗАЯВИТЕЛЮ</div>
                  {(detail.notes || []).map((n: any) => <div key={n.id} style={{ background: "var(--warn-bg)", borderRadius: 8, padding: "7px 10px", fontSize: 13, marginTop: 6 }}>{n.text}</div>)}
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Заметка…" style={{ fontSize: 13 }} />
                    <button className="btn-ghost" onClick={() => { if (note.trim()) { act("note", { text: note }); setNote(""); } }}>＋</button>
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
