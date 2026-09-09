import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./hooks/useAuth";
import { ToastProvider } from "./hooks/useToast";
import "./styles/theme.css";

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: "system-ui, sans-serif", background: "#fff", color: "#1c2a38", minHeight: "100vh" }}>
          <h2 style={{ color: "#b42318" }}>Ошибка интерфейса</h2>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 13, background: "#fef3f2", border: "1px solid #fecdca", padding: 16, borderRadius: 10 }}>
            {this.state.error.message}
            {"\n\n"}
            {this.state.error.stack}
          </pre>
          <button onClick={() => location.reload()} style={{ padding: "10px 16px", borderRadius: 8, border: 0, background: "#175cd3", color: "#fff", cursor: "pointer" }}>
            Перезагрузить
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);