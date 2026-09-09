import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import { Home, New, Done, Track } from "./screens/public";
import { Login, Operator, Expert, Admin } from "./screens/staff";

function App() {
  const [hash, setHash] = useState(location.hash || "#/");
  useEffect(() => {
    const fn = () => setHash(location.hash || "#/");
    addEventListener("hashchange", fn);
    return () => removeEventListener("hashchange", fn);
  }, []);
  const nav = (h: string) => (location.hash = h);
  let screen: React.ReactNode = <Home nav={nav} />;
  if (hash.startsWith("#/new")) screen = <New nav={nav} />;
  else if (hash.startsWith("#/done")) screen = <Done nav={nav} />;
  else if (hash.startsWith("#/track")) screen = <Track />;
  else if (hash.startsWith("#/login")) screen = <Login nav={nav} />;
  else if (hash.startsWith("#/operator")) screen = <Operator />;
  else if (hash.startsWith("#/expert")) screen = <Expert />;
  else if (hash.startsWith("#/admin")) screen = <Admin />;
  return (
    <>
      <nav className="top">
        <a href="#/" className="logo">Отклик</a>
        <a href="#/track">Статус</a>
        <a href="#/login">Вход</a>
      </nav>
      <div className="wrap">{screen}</div>
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
