import { useEffect, useState } from "react";
import { api } from "../api/client";
import Shell, { NeedRole } from "../components/Shell";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../hooks/useAuth";

export default function Settings() {
  const { push } = useToast();
  const { role } = useAuth();
  const [cats, setCats] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [cn, setCn] = useState(""); const [rc, setRc] = useState(""); const [rg, setRg] = useState("");
  const [aid, setAid] = useState(""); const [reason, setReason] = useState(""); const [st, setSt] = useState(""); const [pri, setPri] = useState("");
  const [transfers, setTransfers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [newExp, setNewExp] = useState<Record<string, string>>({});
  const load = async () => {
    try {
      setCats(await api.get("/admin/categories"));
      setGroups(await api.get("/admin/groups"));
      setTransfers(await api.get("/admin/transfers"));
      setUsers(await api.get("/admin/users"));
      setLogs(await api.get("/admin/logs?limit=50"));
    } catch (e: any) { push(e.message, "err"); }
  };
  useEffect(() => { load(); }, []);
  const resolveTransfer = async (appealId: string) => {
    const expertId = newExp[appealId];
    if (!expertId) return push("Выбери нового исполнителя", "err");
    await api.post(`/admin/appeals/${appealId}/transfer-resolve`, { new_expert_id: expertId });
    push("Передача подтверждена 🤝", "ok"); load();
  };
  const addCat = async () => { if (!cn) return; await api.post("/admin/categories", { name: cn, is_free_fallback: false }); setCn(""); load(); push("Категория добавлена", "ok"); };
  const addRule = async () => { if (!rc || !rg) return push("Выберите категорию и группу", "err"); await api.post("/admin/routing-rules", { category_id: rc, group_id: rg }); push("Маршрут связан 🧭", "ok"); };
  const adminAct = async () => {
    if (!aid || !reason) return push("Нужен ID обращения и причина (в журнал)", "err");
    const body: any = { reason };
    if (st) body.status = st; if (pri) body.priority = pri;
    await api.post(`/admin/appeals/${aid}/action`, body); push("Применено и записано в журнал", "ok");
  };
  if (role && role !== "admin") return <NeedRole role={role} need="admin" label="администратора" />;

  return (
    <Shell>
      <h1 className="serif" style={{ fontSize: 24, margin: "0 0 12px" }}>Настройка пространства</h1>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, alignItems: "start" }}>
        <div className="card" style={{ padding: 18 }}>
          <b>📂 Категории</b>
          <div style={{ display: "flex", gap: 8, margin: "10px 0" }}><input className="input" value={cn} onChange={(e) => setCn(e.target.value)} placeholder="Новая…" /><button className="btn-primary" onClick={addCat}>＋</button></div>
          {cats.map((c) => <div key={c.id} className="queue-item" style={{ cursor: "default", marginBottom: 6, fontSize: 13.5 }}>🌱 {c.name}</div>)}
        </div>
        <div className="card" style={{ padding: 18 }}>
          <b>🧭 Маршрутизация</b>
          <p style={{ fontSize: 12.5, color: "var(--muted)" }}>Категория → группа. Подсказка оператору строится отсюда.</p>
          <select className="select" value={rc} onChange={(e) => setRc(e.target.value)} style={{ marginBottom: 8 }}><option value="">Категория…</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <select className="select" value={rg} onChange={(e) => setRg(e.target.value)}><option value="">Группа…</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.display_label}</option>)}</select>
          <button className="btn-primary" style={{ width: "100%", marginTop: 10 }} onClick={addRule}>Связать</button>
        </div>
        <div className="card" style={{ padding: 18 }}>
          <b>🛡️ Вмешательство админа</b>
          <p style={{ fontSize: 12.5, color: "var(--muted)" }}>Смена статуса/приоритета любого обращения. Причина обязательна — пишется в AdminLog.</p>
          <input className="input" value={aid} onChange={(e) => setAid(e.target.value)} placeholder="UUID обращения" style={{ marginBottom: 8, fontSize: 12 }} />
          <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Причина (в журнал)…" style={{ marginBottom: 8 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <select className="select" value={st} onChange={(e) => setSt(e.target.value)}><option value="">Статус…</option><option value="completed">completed</option><option value="rejected">rejected</option><option value="assigned">assigned</option><option value="in_progress">in_progress</option></select>
            <select className="select" value={pri} onChange={(e) => setPri(e.target.value)}><option value="">Приоритет…</option><option value="low">low</option><option value="standard">standard</option><option value="urgent">urgent</option></select>
          </div>
          <button className="btn-ghost" style={{ width: "100%", marginTop: 10 }} onClick={() => { adminAct(); setTimeout(load, 800); }}>Применить</button>
        </div>
      </div>

      <div className="card" style={{ padding: 18, marginTop: 16 }}>
        <b>📜 Журнал действий</b>
        <p style={{ fontSize: 12.5, color: "var(--muted)" }}>Кто из админов что менял и почему. Свежие сверху.</p>
        {logs.length === 0 && <div style={{ fontSize: 13.5, color: "var(--faint)" }}>Пока пусто — записи появятся после действий администратора</div>}
        {logs.map((l, i) => (
          <div key={i} className="queue-item" style={{ cursor: "default", marginBottom: 6, fontSize: 13 }}>
            <div><b>{l.action}</b> · {l.admin || "—"} {l.track_number && <span style={{ color: "var(--teal-deep)", fontWeight: 700 }}>{l.track_number}</span>}</div>
            {l.reason && <div style={{ color: "#4a5a5a", marginTop: 3 }}>«{l.reason}»</div>}
            <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 3 }}>{l.created_at ? new Date(l.created_at).toLocaleString("ru") : ""}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 18, marginTop: 16 }}>
        <b>🔀 Запросы передачи {transfers.length > 0 && <span className="badge" style={{ background: "var(--warn-bg)", color: "var(--warn)", marginLeft: 6 }}>{transfers.length}</span>}</b>
        <p style={{ fontSize: 12.5, color: "var(--muted)" }}>Эксперты просят передать обращение коллеге. Выбери нового исполнителя — статус вернётся в «Назначено».</p>
        {transfers.length === 0 && <div style={{ fontSize: 13.5, color: "var(--faint)" }}>Запросов нет — всё спокойно 🌱</div>}
        {transfers.map((t) => (
          <div key={t.appeal_id} className="queue-item" style={{ cursor: "default", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <b style={{ fontSize: 13 }}>{t.track_number}</b> <span style={{ fontSize: 12, color: "var(--muted)" }}>· {t.status} · просит {t.requested_by || "эксперт"}</span>
              <div style={{ fontSize: 13, marginTop: 4 }}>«{t.reason}»</div>
            </div>
            <select className="select" style={{ width: 200 }} value={newExp[t.appeal_id] || ""} onChange={(e) => setNewExp((p) => ({ ...p, [t.appeal_id]: e.target.value }))}>
              <option value="">Новый исполнитель…</option>
              {users.filter((u) => u.role === "expert").map((u) => <option key={u.id} value={u.id}>{u.display_name} ({u.username})</option>)}
            </select>
            <button className="btn-primary" style={{ padding: "9px 14px" }} onClick={() => resolveTransfer(t.appeal_id)}>Подтвердить</button>
          </div>
        ))}
      </div>
    </Shell>
  );
}
