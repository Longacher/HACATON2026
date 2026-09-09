import { useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const ROLE_LABEL: Record<string, string> = { admin: "Админ", operator: "Оператор", expert: "Эксперт" };
const ROLE_EMOJI: Record<string, string> = { admin: "🌿", operator: "🤝", expert: "💚" };

export function NeedRole({ role, need, label }: { role: string | null; need: string; label: string }) {
  return (
    <Shell>
      <div className="card" style={{ padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 44 }}>🔒</div>
        <h2 className="serif">Нужна роль: {label}</h2>
        <p style={{ color: "var(--muted)" }}>Вы вошли как «{role}». Добавьте нужный аккаунт в один клик — переключаться можно без выхода.</p>
        <a href="/login?add=1" className="btn-primary" style={{ display: "inline-block", textDecoration: "none", marginTop: 8 }}>＋ Добавить {need}</a>
      </div>
    </Shell>
  );
}

export default function Shell({ children }: { children: ReactNode }) {
  const { sessions, activeIndex, active, role, switchTo, removeSession, logoutAll } = useAuth();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();

  const go = (i: number) => { switchTo(i); setOpen(false); };
  const add = () => { setOpen(false); nav("/login?add=1"); };

  const links = [
    { to: "/queue", label: "Очередь", icon: "💌", roles: ["operator", "admin"] },
    { to: "/my", label: "Мои обращения", icon: "🌱", roles: ["expert", "admin"] },
    { to: "/team", label: "Команда", icon: "🤝", roles: ["admin"] },
    { to: "/settings", label: "Настройка", icon: "🧭", roles: ["admin"] },
    { to: "/analytics", label: "Аналитика", icon: "📊", roles: ["admin"] },
  ];
  const visible = links.filter((l) => !role || l.roles.includes(role) || role === "admin");

  return (
    <div className="otklik-page" style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "248px 1fr" }}>
      <aside style={{ background: "rgba(255,253,248,.92)", backdropFilter: "blur(12px)", borderRight: "1px solid var(--line)", padding: 16, display: "flex", flexDirection: "column", gap: 4, position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 13, background: "linear-gradient(135deg,#2e7d7b,#7fb69e)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Lora,serif", fontWeight: 700, fontSize: 19 }}>О</div>
          <div><div className="serif" style={{ fontWeight: 700, fontSize: 16 }}>Отклик</div><div style={{ fontSize: 11.5, color: "var(--muted)" }}>команда заботы</div></div>
        </div>

        <div style={{ position: "relative", marginBottom: 12 }}>
          <button className="btn-ghost" style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }} onClick={() => setOpen((v) => !v)}>
            <span>{ROLE_EMOJI[role || ""] || "👤"} {active?.name || "—"} <span style={{ color: "var(--muted)", fontWeight: 500 }}>· {ROLE_LABEL[role || ""] || role}</span></span>
            <span style={{ color: "var(--muted)" }}>▾</span>
          </button>
          {open && (
            <div className="card" style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, zIndex: 20, padding: 8 }}>
              {sessions.map((s, i) => (
                <div key={i} onClick={() => go(i)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", borderRadius: 10, cursor: "pointer", background: i === activeIndex ? "var(--teal-soft)" : "transparent", fontSize: 13.5 }}>
                  <span style={{ flex: 1, fontWeight: i === activeIndex ? 800 : 500 }}>{ROLE_EMOJI[s.role]} {s.name} <span style={{ color: "var(--muted)" }}>· {s.username}</span></span>
                  {sessions.length > 1 && <button onClick={(e) => { e.stopPropagation(); removeSession(i); }} title="Убрать" style={{ border: 0, background: "transparent", cursor: "pointer", color: "var(--muted)" }}>✕</button>}
                </div>
              ))}
              <button className="btn-ghost" style={{ width: "100%", marginTop: 6 }} onClick={add}>＋ Добавить аккаунт</button>
              <button onClick={logoutAll} style={{ width: "100%", marginTop: 6, border: 0, background: "transparent", color: "var(--crisis)", cursor: "pointer", fontSize: 13 }}>Выйти из всех</button>
              <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 6, lineHeight: 1.5 }}>Совет: держите op + psy1 + admin одновременно — переключение в 1 клик, без паролей.</div>
            </div>
          )}
        </div>

        {visible.map((l) => (
          <NavLink key={l.to} to={l.to} style={({ isActive }) => ({ textDecoration: "none", padding: "10px 12px", borderRadius: 12, fontSize: 14, fontWeight: isActive ? 800 : 500, color: isActive ? "var(--teal-deep)" : "var(--ink)", background: isActive ? "var(--teal-soft)" : "transparent" })}>
            {l.icon} {l.label}
          </NavLink>
        ))}
        <div style={{ marginTop: "auto", fontSize: 11.5, color: "var(--faint)", lineHeight: 1.6, padding: "10px 4px 0" }}>
          🛡️ Заявители анонимны.<br />Тексты — только по роли.<br /><span style={{ opacity: 0.8 }}>j/k — листать · / — поиск</span>
        </div>
      </aside>
      <main style={{ minWidth: 0, padding: "20px 22px 60px", maxWidth: 1280 }}>{children}</main>
    </div>
  );
}
