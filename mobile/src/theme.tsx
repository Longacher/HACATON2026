import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";

// На web нет нативного Animated-модуля — все timing идут через JS-движок.
export const NATIVE_ANIM = Platform.OS !== "web";

export const palette = {
  bg: "#F6F3EC",
  surface: "#FFFDF8",
  ink: "#2D3A3A",
  muted: "#7A8B8B",
  faint: "#A8B5B3",
  line: "#E7E0D3",
  teal: "#2E7D7B",
  tealDeep: "#245F5D",
  tealSoft: "#E3F0EE",
  sage: "#7FB69E",
  sageSoft: "#E9F3EB",
  sand: "#E8DCCF",
  peach: "#F3DDC8",
  rose: "#D9A7A0",
  roseSoft: "#FBEFEA",
  crisis: "#B66E5A",
  crisisBg: "#FDF0EB",
  ok: "#4A8A6D",
  warnBg: "#FDF6E3",
  btn: "#2E7D7B",
  onBtn: "#FFFFFF",
};

export type Colors = typeof palette;

// Тёплая ночь: глубокий teal-slate вместо чёрного — не бьёт по глазам
export const night: Colors = {
  bg: "#1C2624",
  surface: "#24312D",
  ink: "#EDF3EE",
  muted: "#9DB3AD",
  faint: "#6E847F",
  line: "#38463F",
  teal: "#5FB3A6",
  tealDeep: "#8FD4C7",
  tealSoft: "#2A3F3A",
  sage: "#7FB69E",
  sageSoft: "#2C4038",
  sand: "#4A4238",
  peach: "#5A4A3A",
  rose: "#D9A7A0",
  roseSoft: "#4A322C",
  crisis: "#E0977F",
  crisisBg: "#3D2A24",
  ok: "#7FBF9A",
  warnBg: "#3D3423",
  btn: "#2F7E75",
  onBtn: "#FFFFFF",
};

export const fonts = {
  body: "Nunito_400Regular",
  bold: "Nunito_700Bold",
  head: "Nunito_800ExtraBold",
};

export const shadow = Platform.select({
  // shadow*-пропсы deprecated на web — только boxShadow
  web: { boxShadow: "0 8px 16px rgba(46,95,93,0.12)" },
  default: {
    shadowColor: "#2E5F5D",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
});

type Scheme = "day" | "night";

interface ThemeCtx {
  C: Colors;
  scheme: Scheme;
  auto: boolean;
  toggle: () => void;
}

const Ctx = createContext<ThemeCtx>({ C: palette, scheme: "day", auto: true, toggle: () => {} });

function isNightHour(): boolean {
  const h = new Date().getHours();
  return h >= 21 || h < 7;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [override, setOverride] = useState<Scheme | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    try {
      const v = typeof localStorage !== "undefined" ? localStorage.getItem("otklik_scheme") : null;
      if (v === "day" || v === "night") setOverride(v);
    } catch {}
    const t = setInterval(() => setTick((x) => x + 1), 15 * 60 * 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scheme: Scheme = override ?? (isNightHour() ? "night" : "day");
  const toggle = useCallback(() => {
    setOverride((prev) => {
      const cur: Scheme = prev ?? (isNightHour() ? "night" : "day");
      const next: Scheme = cur === "day" ? "night" : "day";
      try { localStorage.setItem("otklik_scheme", next); } catch {}
      return next;
    });
  }, []);

  const val = useMemo<ThemeCtx>(
    () => ({ C: scheme === "night" ? night : palette, scheme, auto: override === null, toggle }),
    [scheme, override, toggle],
  );
  return <Ctx.Provider value={val}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  return useContext(Ctx);
}
