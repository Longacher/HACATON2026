import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform, StyleSheet, Text } from "react-native";
import { NATIVE_ANIM } from "./theme";

const Ctx = createContext<{ push: (text: string) => void }>({ push: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [key, setKey] = useState(0);
  const v = useRef(new Animated.Value(0)).current;
  const timer = useRef<any>(null);

  const push = useCallback((text: string) => {
    setMsg(text);
    setKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (msg == null) return;
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: NATIVE_ANIM }).start();
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      Animated.timing(v, { toValue: 0, duration: 300, useNativeDriver: NATIVE_ANIM }).start(({ finished }) => {
        if (finished) setMsg(null);
      });
    }, 2800);
    return () => clearTimeout(timer.current);
  }, [msg, key, v]);

  return (
    <Ctx.Provider value={{ push }}>
      {children}
      {msg != null && (
        <Animated.View style={[styles.toast, { pointerEvents: "none", opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}>
          <Text style={styles.text}>{msg}</Text>
        </Animated.View>
      )}
    </Ctx.Provider>
  );
}

export function useToast(): { push: (text: string) => void } {
  return useContext(Ctx);
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute", left: 24, right: 24, bottom: 48,
    backgroundColor: "rgba(34,48,44,.96)", borderRadius: 14,
    paddingVertical: 13, paddingHorizontal: 16, alignItems: "center",
    // shadow*-пропсы deprecated на web — только boxShadow
    ...Platform.select({
      web: { boxShadow: "0 4px 12px rgba(0,0,0,0.25)" },
      default: {
        shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 }, elevation: 6,
      },
    }),
  },
  text: { color: "#fff", fontSize: 13.5, fontWeight: "600", textAlign: "center", lineHeight: 19 },
});
