import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { api } from "../api/client";
import { useToast } from "../hooks/useToast";

const DEMO: [string, string, string, string][] = [
  ["Администратор", "admin", "admin123", "🌿"],
  ["Оператор", "op", "op123", "🤝"],
  ["Психолог", "psy1", "psy123", "💚"],
  ["Психолог 2", "psy2", "psy123", "🌱"],
  ["Юрист", "jur", "jur123", "⚖️"],
  ["Соц. педагог", "soc", "soc123", "📚"],
];

export default function Login() {
  const { login, sessions } = useAuth();
  const [sp] = useSearchParams();
  const isAdd = sp.get("add") === "1";
  const nav = useNavigate();
  const { push } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyDemo, setBusyDemo] = useState("");

  const doLogin = async (u: string, p: string) => {
    setBusy(true); setBusyDemo(u); setError("");
    try {
      const res = await api.post<{ access_token: string; role: string; display_name: string }>("/auth/login", { username: u, password: p });
      login(res.access_token, res.role, res.display_name, u);
      push(`Привет, ${res.display_name}! Аккаунт ${u} подключён`, "ok");
      nav(res.role === "expert" ? "/my" : res.role === "operator" ? "/queue" : "/analytics", { replace: true });
    } catch (err: any) { setError(err.message || "Ошибка входа"); }
    finally { setBusy(false); setBusyDemo(""); }
  };
  const submit = (e: FormEvent) => { e.preventDefault(); doLogin(username, password); };

  return (
    <div className="otklik-page" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, position: "relative" }}>
      <div className="blob blob-1" /><div className="blob blob-2" />
      <div className="card stagger" style={{ width: 480, maxWidth: "100%", padding: 32, zIndex: 1 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 50, height: 50, borderRadius: 17, background: "linear-gradient(135deg,#2e7d7b,#7fb69e)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Lora,serif", fontSize: 24, fontWeight: 700 }}>О</div>
          <div><div className="serif" style={{ fontSize: 22, fontWeight: 700 }}>{isAdd ? "Добавить аккаунт" : "Отклик · вход команды"}</div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>{isAdd ? `Уже подключено: ${sessions.length}. Пароль спросим один раз.` : "Можно держать несколько аккаунтов сразу"}</div></div>
        </div>
        <form onSubmit={submit} style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Логин" autoFocus style={{ flex: 1 }} />
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Пароль" style={{ flex: 1 }} />
          <button className="btn-primary" disabled={busy || !username || !password} style={{ whiteSpace: "nowrap" }}>{busy && !busyDemo ? "…" : "Войти"}</button>
        </form>
        {error && <div style={{ color: "var(--crisis)", background: "var(--crisis-bg)", border: "1px solid #e8b8a6", padding: "9px 12px", borderRadius: 10, fontSize: 13, marginTop: 10 }}>{error}</div>}
        <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--faint)", margin: "18px 0 8px" }}>Быстрое подключение · 1 клик</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {DEMO.map(([label, u, p, emoji]) => (
            <button key={u} className="btn-ghost" disabled={busy} onClick={() => doLogin(u, p)} style={{ display: "flex", justifyContent: "space-between", opacity: busyDemo === u ? 0.6 : 1 }}>
              <span>{emoji} {label}</span><span style={{ color: "var(--muted)", fontSize: 12 }}>{u}</span>
            </button>
          ))}
        </div>
        <div className="safety-note" style={{ marginTop: 16 }}>🛡️ Сессии хранятся только в этом браузере. Для демо — подключайте сразу admin + op + psy1 и переключайтесь в сайдбаре.</div>
      </div>
    </div>
  );
}
