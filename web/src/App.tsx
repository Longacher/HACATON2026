import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Queue from "./pages/Queue";
import My from "./pages/My";
import Team from "./pages/Team";
import Settings from "./pages/Settings";
import Analytics from "./pages/Analytics";
import { useAuth } from "./hooks/useAuth";
import type { ReactElement } from "react";

function Guard({ children, roles }: { children: ReactElement; roles?: string[] }) {
  const { active, role } = useAuth();
  if (!active) return <Navigate to="/login" replace />;
  if (roles && role && !roles.includes(role) && role !== "admin") {
    return <Navigate to={role === "expert" ? "/my" : "/queue"} replace />;
  }
  return children;
}

export default function App() {
  const { active, role } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/queue" element={<Guard roles={["operator"]}><Queue /></Guard>} />
      <Route path="/my" element={<Guard roles={["expert"]}><My /></Guard>} />
      <Route path="/team" element={<Guard roles={["admin"]}><Team /></Guard>} />
      <Route path="/settings" element={<Guard roles={["admin"]}><Settings /></Guard>} />
      <Route path="/analytics" element={<Guard roles={["admin"]}><Analytics /></Guard>} />
      <Route path="/" element={!active ? <Navigate to="/login" replace /> : role === "expert" ? <Navigate to="/my" replace /> : role === "operator" ? <Navigate to="/queue" replace /> : <Navigate to="/analytics" replace />} />
      <Route path="/operator" element={<Navigate to="/queue" replace />} />
      <Route path="/expert" element={<Navigate to="/my" replace />} />
      <Route path="/admin" element={<Navigate to="/analytics" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
