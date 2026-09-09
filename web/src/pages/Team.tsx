import { useEffect, useState } from "react";
import { api } from "../api/client";
import Shell, { NeedRole } from "../components/Shell";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../hooks/useAuth";

export default function Team() {
  const { push } = useToast();
  const { role } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [u, setU] = useState(""); const [p, setP] = useState(""); const [r, setR] = useState("expert"); const [dn, setDn] = useState(""); const [mx, setMx] = useState(5);
  const [g, setG] = useState("");
  const load = async () => {
    try { setUsers(await api.get("/admin/users")); setGroups(await api.get("/admin/groups")); }
    catch (e: any) { push(e.message, "err"); }
  };
  useEffect(() => { load(); }, []);
  const addUser = async () => {
    if (!u || !p) return push("Логин и пароль обязательны", "err");
    await api.post("/admin/users", { username: u, password: p, role: r, display_name: dn || u, max_active_appeals: mx });
    push(`Приглашён ${u} · ${r}`, "ok"); setU(""); setP(""); setDn(""); load();
  };
  const addGroup = async () => { if (!g) return; await api.post("/admin/groups", { name: g, display_label: g }); setG(""); load(); push("Группа создана", "ok"); };

  if (role && role !== "admin") return <NeedRole role={role} need="admin" label="администратора" />;

  return (
    <Shell>
      <h1 className="serif" style={{ fontSize: 24, margin: "0 0 12px" }}>Команда заботы</h1>
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16, alignItems: "start" }}>
        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>＋ Пригласить человека</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <input className="input" value={u} onChange={(e) => setU(e.target.value)} placeholder="Логин (напр. psy3)" />
            <input className="input" value={p} onChange={(e) => setP(e.target.value)} placeholder="Пароль" type="text" />
            <input className="input" value={dn} onChange={(e) => setDn(e.target.value)} placeholder="Имя для команды" />
            <div style={{ display: "flex", gap: 8 }}>
              <select className="select" value={r} onChange={(e) => setR(e.target.value)}><option value="operator">🤝 Оператор</option><option value="expert">💚 Эксперт</option><option value="admin">🌿 Админ</option></select>
              <input className="input" type="number" value={mx} onChange={(e) => setMx(Number(e.target.value))} title="Лимит активных" style={{ width: 80 }} />
            </div>
          </div>
          <button className="btn-primary" style={{ marginTop: 10, width: "100%" }} onClick={addUser}>Пригласить</button>
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }} className="stagger">
            {users.map((x) => (
              <div key={x.id} className="queue-item" style={{ cursor: "default", marginBottom: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span><b>{x.display_name}</b> <span style={{ color: "var(--muted)" }}>· {x.username} · {x.role}</span></span>
                <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => { navigator.clipboard?.writeText(`${x.username}`); push("Логин скопирован", "ok"); }}>копировать</button>
              </div>
            ))}
          </div>
        </div>
        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>🧭 Группы специалистов</div>
          <div style={{ display: "flex", gap: 8 }}><input className="input" value={g} onChange={(e) => setG(e.target.value)} placeholder="Напр. Юристы-волонтёры" /><button className="btn-ghost" onClick={addGroup}>＋</button></div>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {groups.map((x) => <div key={x.id} className="queue-item" style={{ cursor: "default", marginBottom: 0 }}>🌱 {x.display_label} <span style={{ color: "var(--faint)", fontSize: 12 }}>· {x.name}</span></div>)}
          </div>
          <div className="safety-note" style={{ marginTop: 12 }}>💡 Лимит активных обращений защищает от выгорания: психологам — 5, юристам — 3.</div>
        </div>
      </div>
    </Shell>
  );
}
