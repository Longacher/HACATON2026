import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

interface Toast { id: number; text: string; kind: "ok" | "err" | "info"; }
const Ctx = createContext<{ push: (text: string, kind?: Toast["kind"]) => void } | null>(null);
let seq = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string, kind: Toast["kind"] = "info") => {
    const id = seq++;
    setItems((p) => [...p, { id, text, kind }]);
    setTimeout(() => setItems((p) => p.filter((t) => t.id !== id)), 3400);
  }, []);
  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 100, display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((t) => (
          <div key={t.id} style={{
            background: t.kind === "err" ? "#2d1a15" : t.kind === "ok" ? "#1d3a2f" : "#24373a",
            color: "#fff", padding: "11px 16px", borderRadius: 12, fontSize: 13.5, fontWeight: 600,
            boxShadow: "0 10px 30px rgba(0,0,0,.25)", animation: "rise .3s ease both", maxWidth: 340,
            borderLeft: `4px solid ${t.kind === "err" ? "#e07a5f" : t.kind === "ok" ? "#7fb69e" : "#8ab4c8"}`,
          }}>{t.text}</div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) return { push: (_: string) => {} };
  return ctx;
}
