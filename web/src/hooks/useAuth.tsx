import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { readActiveIndex } from "../api/client";

export interface Session { token: string; role: string; name: string; username: string; addedAt: number; }
interface AuthCtx {
  sessions: Session[];
  active: Session | null;
  activeIndex: number;
  role: string | null;
  name: string | null;
  login: (token: string, role: string, name: string, username: string) => void;
  switchTo: (i: number) => void;
  removeSession: (i: number) => void;
  logout: () => void;
  logoutAll: () => void;
}

const KEY = "otklik_sessions";
const ACTIVE_KEY = "otklik_active";
const LEGACY = "token";

function load(): Session[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  try {
    const t = localStorage.getItem(LEGACY);
    const r = localStorage.getItem("role");
    const n = localStorage.getItem("name");
    if (t && r) return [{ token: t, role: r, name: n || r, username: n || r, addedAt: Date.now() }];
  } catch {}
  return [];
}

function persistActive(i: number) {
  try { localStorage.setItem(ACTIVE_KEY, String(i)); } catch {}
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<Session[]>(load);
  const [activeIndex, setActiveIndexState] = useState(() =>
    Math.min(readActiveIndex(), Math.max(0, load().length - 1)),
  );

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(sessions)); } catch {} }, [sessions]);
  useEffect(() => { if (activeIndex >= sessions.length) setActive(sessions.length - 1 < 0 ? 0 : sessions.length - 1); }, [sessions, activeIndex]);

  // Протухший/отозванный токен: убираем активную сессию, дальше Guard уведёт на /login
  useEffect(() => {
    const h = () => {
      setSessions((p) => {
        if (!p.length) return p;
        const i = Math.min(readActiveIndex(), p.length - 1);
        return p.filter((_, x) => x !== i);
      });
      setActive(0);
    };
    window.addEventListener("otklik:unauthorized", h);
    return () => window.removeEventListener("otklik:unauthorized", h);
  }, []);

  const setActive = useCallback((i: number) => {
    const v = Math.max(0, i);
    persistActive(v);
    setActiveIndexState(v);
  }, []);

  const login = useCallback((token: string, role: string, name: string, username: string) => {
    const sess: Session = { token, role, name, username, addedAt: Date.now() };
    setSessions((prev) => {
      const i = prev.findIndex((s) => s.username === username && s.role === role);
      if (i >= 0) {
        const next = [...prev];
        next[i] = sess;
        return next;
      }
      return [...prev, sess];
    });
    // индекс — отдельно и синхронно: без сайд-эффектов внутри updater, без гонки токена
    try {
      const raw = localStorage.getItem(KEY);
      const prev = raw ? JSON.parse(raw) : [];
      const i = Array.isArray(prev) ? prev.findIndex((s: Session) => s.username === username && s.role === role) : -1;
      setActive(i >= 0 ? i : prev.length);
    } catch { setActive(0); }
  }, [setActive]);

  const switchTo = useCallback((i: number) => setActive(i), [setActive]);
  const removeSession = useCallback((i: number) => setSessions((p) => p.filter((_, x) => x !== i)), []);
  const logout = useCallback(() => {
    const i = readActiveIndex();
    try {
      const raw = localStorage.getItem(KEY);
      const arr = raw ? JSON.parse(raw) : [];
      setSessions(Array.isArray(arr) ? arr.filter((_: unknown, x: number) => x !== i) : []);
    } catch { setSessions([]); }
    setActive(0);
  }, [setActive]);
  const logoutAll = useCallback(() => { setSessions([]); setActive(0); try { localStorage.removeItem(LEGACY); localStorage.removeItem("role"); localStorage.removeItem("name"); } catch {} }, [setActive]);

  const active = sessions[Math.min(activeIndex, Math.max(0, sessions.length - 1))] || null;
  const val = useMemo(() => ({
    sessions, active, activeIndex,
    role: active?.role || null, name: active?.name || null,
    login, switchTo, removeSession, logout, logoutAll,
  }), [sessions, active, activeIndex, login, switchTo, removeSession, logout, logoutAll]);

  return <Ctx.Provider value={val}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
