import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "../api/client";
import type { AppealFull, QueueItem } from "../api/types";
import Shell from "../components/Shell";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../hooks/useAuth";

export default function Queue() {
  const { push } = useToast();
  const { role } = useAuth();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [control, setControl] = useState<QueueItem[]>([]);
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "crisis" | "returned" | "control" | "complaints">("all");
  const [selId, setSelId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AppealFull | null>(null);
  const [hint, setHint] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selCat, setSelCat] = useState(""); const [selPri, setSelPri] = useState("standard"); const [selExp, setSelExp] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [overdue, setOverdue] = useState(0);

  const fmtWait = (h?: number) => {
    if (h == null) return "";
    if (h < 1) return `ждёт ${Math.max(1, Math.round(h * 60))} мин`;
    if (h < 24) return `ждёт ${Math.floor(h)} ч`;
    return `ждёт ${Math.floor(h / 24)} дн`;
  };

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get<{ items: QueueItem[]; overdue_count: number }>("/operator/queue");
      setQueue(res.items); setOverdue(res.overdue_count || 0); setDenied(false);
      try { const d = await api.get<{ items: QueueItem[] }>("/operator/distributed"); setControl(d.items); } catch {}
      try { setCats(await api.get("/categories")); } catch {}
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 403) setDenied(true);
      else if (!silent) push("Не удалось загрузить очередь: " + e.message, "err");
    } finally { setLoading(false); }
  }, [push]);

  useEffect(() => { load(); const t = setInterval(() => load(true), 20000); return () => clearInterval(t); }, [load]);

  const open = async (id: string) => {
    setSelId(id);
    try {
      const d = await api.get<AppealFull>(`/operator/appeals/${id}`);
      setDetail(d); setSelCat(d.category_id || ""); setSelPri(d.priority || "standard"); setSelExp(d.expert?.id || "");
      try { setHint(await api.get(`/operator/hint/${id}`)); } catch { setHint(null); }
    } catch (e: any) { push(e.message, "err"); }
  };

  const act = async (action: string, extra: any = {}) => {
    if (!selId || busy) return; setBusy(true);
    try {
      await api.post(`/operator/appeals/${selId}/process`, { action, priority: extra.priority || selPri, ...extra });
      push(action === "assign" ? "Передано специалисту 💌" : action === "reject" ? "Отклонено бережно" : "Готово", "ok");
      setDetail(null); setSelId(null); load(true);
    } catch (e: any) { push(e.message, "err"); } finally { setBusy(false); }
  };

  const items = useMemo(() => {
    const base = filter === "control" ? control : queue;
    let r = base;
    if (filter === "crisis") r = queue.filter((x) => x.is_crisis);
    if (filter === "returned") r = queue.filter((x) => x.status === "returned");
    if (filter === "complaints") r = [...queue, ...control].filter((x) => x.has_complaint);
    if (q.trim()) { const s = q.trim().toLowerCase(); r = r.filter((x) => x.track_number.toLowerCase().includes(s) || (x.excerpt || "").toLowerCase().includes(s)); }
    return r;
  }, [queue, control, filter, q]);

  const unseenComplaints = useMemo(
    () => [...queue, ...control].filter((x) => x.has_complaint && !x.complaint_seen).length,
    [queue, control],
  );

  const markComplaintSeen = async () => {
    if (!selId) return;
    try {
      await api.post(`/operator/appeals/${selId}/complaint-seen`);
      push("Жалоба отмечена просмотренной", "ok");
      const det = await api.get<AppealFull>(`/operator/appeals/${selId}`);
      setDetail(det); load(true);
    } catch (e: any) { push(e.message, "err"); }
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== searchRef.current) { e.preventDefault(); searchRef.current?.focus(); }
      if ((e.key === "j" || e.key === "k") && items.length) {
        const i = items.findIndex((x) => x.id === selId);
        const n = e.key === "j" ? Math.min(items.length - 1, i + 1) : Math.max(0, i - 1);
        open(items[n].id);
      }
      if (e.key === "Escape") { setDetail(null); setSelId(null); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  if (denied) return (
    <Shell><div className="card" style={{ padding: 40, textAlign: "center" }}>
      <div style={{ fontSize: 44 }}>🔒</div>
      <h2 className="serif">Нужна роль оператора</h2>
      <p style={{ color: "var(--muted)" }}>Вы вошли как «{role}». API оператора требует токен оператора.<br />Добавьте аккаунт <b>op / op123</b> в один клик — переключаться можно без выхода.</p>
      <a href="/login?add=1" className="btn-primary" style={{ display: "inline-block", textDecoration: "none", marginTop: 8 }}>＋ Добавить op</a>
    </div></Shell>
  );

  return (
    <Shell>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <h1 className="serif" style={{ margin: 0, fontSize: 24 }}>Очередь заботы</h1>
        <span className="badge" style={{ background: "var(--teal-soft)", color: "var(--teal-deep)" }}>{queue.length} ждут · {queue.filter((x) => x.is_crisis).length} кризис</span>
        {overdue > 0 && <span className="badge crisis-pulse" style={{ background: "var(--crisis-bg)", color: "var(--crisis)" }}>⏰ просрочено: {overdue}</span>}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <input ref={searchRef} className="input" placeholder="/ поиск по треку или тексту…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 280 }} />
          <button className="btn-ghost" onClick={() => load()}>↻</button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {[["all", "💌 Все новые"], ["crisis", "🆘 Кризис"], ["returned", "↩ Возвраты"], ["complaints", "⚠ Жалобы"], ["control", "🌿 Контроль"]].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k as any)} className={filter === k ? "btn-primary" : "btn-ghost"} style={filter === k ? { padding: "8px 14px" } : {}}>{l}{k === "control" ? ` · ${control.length}` : ""}{k === "complaints" && unseenComplaints > 0 ? ` · ${unseenComplaints}` : ""}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "400px 1fr", gap: 16, alignItems: "start" }}>
        <div ref={listRef} style={{ maxHeight: "calc(100vh - 220px)", overflowY: "auto", paddingRight: 2 }} className="stagger">
          {loading && <>{[0, 1, 2].map((i) => <div key={i} className="skel"><div style={{ height: 12, width: "40%", background: "#e0dcd0", borderRadius: 6, marginBottom: 8 }} /><div style={{ height: 12, width: "90%", background: "#e8e4d6", borderRadius: 6 }} /></div>)}</>}
          {!loading && items.length === 0 && <div className="card" style={{ padding: 30, textAlign: "center", color: "var(--muted)" }}>🌱 Тихо — никто не ждёт. Так тоже хорошо.</div>}
          {items.map((it) => (
            <div key={it.id} onClick={() => open(it.id)} className={`queue-item ${selId === it.id ? "selected" : ""} ${it.is_crisis ? "crisis" : ""}`}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <b style={{ fontSize: 13 }}>{it.track_number}</b>
                <span style={{ display: "flex", gap: 6 }}>
                  {it.is_crisis && <span className="badge" style={{ background: "#f6d9cd", color: "#8a4a38" }}>🆘</span>}
                  {it.has_complaint && <span className="badge" style={{ background: "#f6d9cd", color: "#8a4a38" }}>⚠ жалоба{it.complaint_seen ? "" : " · новая"}</span>}
                  {it.status === "returned" && <span className="badge" style={{ background: "var(--warn-bg)", color: "var(--warn)" }}>↩</span>}
                  {it.priority === "urgent" && <span className="badge" style={{ background: "var(--crisis-bg)", color: "var(--crisis)" }}>🔥</span>}
                </span>
              </div>
              <div style={{ fontSize: 13.5, lineHeight: 1.5, color: "#4a5a5a" }}>{it.excerpt || "(своими словами)"}</div>
              <div style={{ fontSize: 11.5, color: it.is_overdue ? "var(--crisis)" : "var(--faint)", fontWeight: it.is_overdue ? 800 : 400, marginTop: 6 }}>
                {it.is_overdue ? `⏰ ${fmtWait(it.wait_hours)} — просрочено` : fmtWait(it.wait_hours)} · {new Date(it.created_at).toLocaleString("ru")} · {it.applicant_type}
              </div>
            </div>
          ))}
        </div>

        <div>
          {!detail && <div className="card" style={{ padding: 50, textAlign: "center", color: "var(--muted)" }}><div style={{ fontSize: 44 }}>🌱</div><div className="serif" style={{ fontSize: 18, color: "var(--ink)" }}>Выберите обращение</div><div style={{ fontSize: 13 }}>j/k — листать · Esc — закрыть · кризис всегда сверху</div></div>}
          {detail && (
            <div className="card" style={{ padding: 22 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span className="badge" style={{ background: "var(--teal-soft)", color: "var(--teal-deep)" }}>{detail.track_number}</span>
                {detail.is_crisis && <span className="badge crisis-pulse" style={{ background: "var(--crisis-bg)", color: "var(--crisis)" }}>🆘 кризисное — первым</span>}
                {detail.status === "returned" && <span className="badge" style={{ background: "var(--warn-bg)", color: "var(--warn)" }}>↩ {detail.return_reason || "возврат"}</span>}
              </div>
              <p className="serif" style={{ fontSize: 17.5, lineHeight: 1.65 }}>{detail.text}</p>
              {detail.complaint && (
                <div style={{ background: "#fdf0eb", border: "1.5px solid #e8b8a6", borderRadius: 12, padding: 12, margin: "10px 0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <b style={{ fontSize: 13.5, color: "#8a4a38" }}>⚠ Жалоба на специалиста (эксперт её не видит)</b>
                    {!detail.complaint.seen && <button className="btn-ghost" style={{ fontSize: 12, padding: "5px 10px" }} onClick={markComplaintSeen}>Отметить просмотренной</button>}
                  </div>
                  {detail.complaint.text && <div style={{ fontSize: 13.5, marginTop: 6 }}>«{detail.complaint.text}»</div>}
                </div>
              )}
              {hint && <div className="hint-box">💡 {hint.note || hint.groups?.map((g: any) => g.label).join(", ")}</div>}
              {((detail.attachments?.length || 0) > 0) && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, margin: "10px 0" }}>
                  {(detail.attachments || []).map((f: any, i: number) => (
                    <a key={i} href={f.url} target="_blank" rel="noreferrer" style={{ fontSize: 13.5, color: "var(--teal-deep)", fontWeight: 600 }}>📎 {f.filename} · {Math.round((f.size_bytes || 0) / 1024)} КБ</a>
                  ))}
                </div>
              )}
              {hint && (hint.all_busy || hint.no_experts) && (
                <div style={{ background: "var(--warn-bg)", border: "1.5px solid #ead9a8", borderRadius: 12, padding: 12, margin: "10px 0", fontSize: 13.5 }}>
                  ⚠ {hint.no_experts ? "В группах нет специалистов — обращение подсвечено администратору" : "Все специалисты перегружены — можно подождать или назначить вопреки нагрузке"}
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.3fr", gap: 10, marginTop: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 800 }}>Категория<select className="select" style={{ marginTop: 6 }} value={selCat} onChange={(e) => setSelCat(e.target.value)}><option value="">…</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                <label style={{ fontSize: 12, fontWeight: 800 }}>Приоритет<select className="select" style={{ marginTop: 6 }} value={selPri} onChange={(e) => setSelPri(e.target.value)}><option value="low">🌱 Низкий</option><option value="standard">🌿 Стандарт</option><option value="urgent">🔥 Срочно</option></select></label>
                <label style={{ fontSize: 12, fontWeight: 800 }}>Специалист<select className="select" style={{ marginTop: 6 }} value={selExp} onChange={(e) => setSelExp(e.target.value)}><option value="">Выбрать…</option>{hint?.groups?.flatMap((g: any) => g.experts).map((ex: any) => <option key={ex.id} value={ex.id}>{ex.display_name} · {ex.load}/{ex.max_active}</option>)}</select></label>
              </div>
              {(detail.transfers || []).some((t) => !t.resolved) && (
                <div style={{ background: "var(--warn-bg)", border: "1.5px solid #ead9a8", borderRadius: 12, padding: 12, marginTop: 12 }}>
                  <b style={{ fontSize: 13.5 }}>🔀 Запрос передачи: «{(detail.transfers || []).find((t) => !t.resolved)?.reason}»</b>
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <select className="select" style={{ flex: 1, minWidth: 180 }} value={selExp} onChange={(e) => setSelExp(e.target.value)}>
                      <option value="">Новый исполнитель…</option>
                      {hint?.groups?.flatMap((g: any) => g.experts).map((ex: any) => <option key={ex.id} value={ex.id}>{ex.display_name} · {ex.load}/{ex.max_active}</option>)}
                    </select>
                    <button className="btn-primary" style={{ padding: "9px 14px" }} disabled={busy || !selExp} onClick={async () => {
                      if (!selId) return; setBusy(true);
                      try { await api.post(`/operator/appeals/${selId}/transfer-resolve`, { new_expert_id: selExp }); push("Передача подтверждена 🤝", "ok"); const d = await api.get<AppealFull>(`/operator/appeals/${selId}`); setDetail(d); load(true); }
                      catch (e: any) { push(e.message, "err"); } finally { setBusy(false); }
                    }}>Подтвердить</button>
                  </div>
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                <button className="btn-primary" disabled={busy || !selExp} onClick={() => act("assign", { expert_id: selExp, category_id: selCat || null })}>💌 Передать специалисту</button>
                <button className="btn-ghost" onClick={() => act("close")}>✅ Ответить и закрыть</button>
                <button className="btn-ghost" style={{ color: "var(--crisis)" }} onClick={() => { const r = prompt("Причина (бережно, увидит заявитель):"); if (r) act("reject", { reason: r }); }}>Отклонить</button>
                <button className="btn-ghost" onClick={() => { setDetail(null); setSelId(null); }}>Esc · закрыть</button>
              </div>
              {detail.contact && <div style={{ background: "var(--crisis-bg)", border: "1px solid #e8b8a6", padding: 10, borderRadius: 10, marginTop: 12, fontSize: 13 }}>📞 {detail.contact.name}: {detail.contact.value}</div>}
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
