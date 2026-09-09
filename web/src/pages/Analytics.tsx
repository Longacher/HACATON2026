import { useEffect, useState } from "react";
import { api, readActiveIndex } from "../api/client";
import Shell, { NeedRole } from "../components/Shell";
import { useToast } from "../hooks/useToast";
import { useAuth } from "../hooks/useAuth";

export default function Analytics() {
  const { push } = useToast();
  const { role } = useAuth();
  const [a, setA] = useState<any>(null);
  const [attention, setAttention] = useState<any[]>([]);
  const [days, setDays] = useState(30);
  const load = async () => {
    try {
      setA(await api.get(`/admin/analytics?period_days=${days}`));
      const att = await api.get<{ items: any[] }>(`/admin/attention`);
      setAttention(att.items || []);
    } catch (e: any) { push(e.message, "err"); }
  };
  useEffect(() => { load(); }, [days]);
  const download = (fmt: "csv" | "xlsx") => {
    const raw = localStorage.getItem("otklik_sessions");
    let token = localStorage.getItem("token");
    try { const arr = JSON.parse(raw || "[]"); token = arr[readActiveIndex()]?.token || token; } catch {}
    fetch(`/api/v1/admin/report.${fmt}?period_days=${days}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob()).then((b) => { const el = document.createElement("a"); el.href = URL.createObjectURL(b); el.download = `report.${fmt}`; el.click(); });
  };
  const maxCat = Math.max(1, ...Object.values((a?.by_category || {}) as Record<string, number>).map(Number));
  const fmtDur = (sec: number | null) => {
    if (sec == null || sec < 0) return "—";
    if (sec < 3600) return `${Math.round(sec / 60)} мин`;
    if (sec < 86400) return `${(sec / 3600).toFixed(1)} ч`;
    return `${(sec / 86400).toFixed(1)} дн`;
  };
  const TYPE_LABEL: Record<string, string> = { student: "🌱 Школьники", parent: "🤝 Родители", teacher: "📚 Педагоги" };
  if (role && role !== "admin") return <NeedRole role={role} need="admin" label="администратора" />;
  return (
    <Shell>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <h1 className="serif" style={{ fontSize: 24, margin: 0 }}>Пульс заботы</h1>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {[7, 30, 90].map((d) => <button key={d} onClick={() => setDays(d)} className={days === d ? "btn-primary" : "btn-ghost"} style={days === d ? { padding: "7px 12px" } : {}}>{d} дн</button>)}
          <button className="btn-ghost" onClick={() => download("csv")}>⬇ CSV</button>
          <button className="btn-ghost" onClick={() => download("xlsx")}>⬇ XLSX</button>
        </div>
      </div>
      {a && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, margin: "14px 0" }} className="stagger">
            {[["💌 Всего", a.total], ["🔥 Срочных", a.urgent], ["🆘 Кризис", a.crisis], ["↩ Возвраты", a.returns]].map(([l, v]: any) => (
              <div key={l} className="card" style={{ padding: 16 }}><div style={{ fontSize: 13, color: "var(--muted)" }}>{l}</div><div className="serif" style={{ fontSize: 34, fontWeight: 700 }}>{v ?? "—"}</div></div>
            ))}
          </div>
          {attention.length > 0 && (
            <div className="card stagger" style={{ padding: 18, marginBottom: 14, borderColor: "#ead9a8", background: "linear-gradient(180deg,#fffdf4,#fdf6e3)" }}>
              <b>⚠ Некого назначить · {attention.length}</b>
              <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Остались в очереди оператора — нет правила, людей или все перегружены.</div>
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                {attention.map((t) => (
                  <div key={t.appeal_id} style={{ fontSize: 13.5 }}>
                    <b>{t.track_number}</b> · {t.reason}{t.is_crisis ? " · 🆘 кризис" : ""}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="card" style={{ padding: 18, marginBottom: 14 }}>
            <b>⏱ Среднее время</b>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginTop: 10 }}>
              {[["До принятия оператором", a.avg_time_to_accept_sec], ["До первого ответа", a.avg_time_to_first_reply_sec], ["До закрытия", a.avg_time_to_close_sec]].map(([l, v]: any) => (
                <div key={l as string}><div style={{ fontSize: 12.5, color: "var(--muted)" }}>{l}</div><div className="serif" style={{ fontSize: 22, fontWeight: 700 }}>{fmtDur(v)}</div></div>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 14 }}>
            <div className="card" style={{ padding: 18 }}>
              <b>По категориям</b>
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                {Object.entries(a.by_category || {}).map(([k, v]: any) => (
                  <div key={k}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span>{k}</span><b>{v}</b></div>
                  <div style={{ height: 8, background: "var(--surface-2)", borderRadius: 6, marginTop: 4 }}><div style={{ width: `${(Number(v) / maxCat) * 100}%`, height: "100%", borderRadius: 6, background: "linear-gradient(90deg,#2e7d7b,#7fb69e)", transition: "width .6s ease" }} /></div></div>
                ))}
              </div>
              <div style={{ marginTop: 14 }}><b>Кто обращается</b>{Object.entries(a.by_applicant_type || {}).map(([k, v]: any) => <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginTop: 8 }}><span>{TYPE_LABEL[k] || k}</span><b>{String(v)}</b></div>)}</div>
            </div>
            <div className="card" style={{ padding: 18 }}><b>По статусам</b>{Object.entries(a.by_status || {}).map(([k, v]: any) => <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginTop: 8 }}><span>{k}</span><b>{String(v)}</b></div>)}</div>
            <div className="card" style={{ padding: 18 }}>
              <b>Нагрузка экспертов</b>{Object.entries(a.expert_load || {}).map(([k, v]: any) => <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginTop: 8 }}><span>{k}</span><b>{String(v)}</b></div>)}
              <div style={{ marginTop: 14 }}><b>Нагрузка операторов</b>{Object.entries(a.operator_load || {}).map(([k, v]: any) => <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginTop: 8 }}><span>{k}</span><b>{String(v)}</b></div>)}</div>
              <div className="safety-note" style={{ marginTop: 12 }}>🛡️ Только агрегаты, без текстов. Так задумано.</div>
            </div>
          </div>
        </>
      )}
    </Shell>
  );
}
