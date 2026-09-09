import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

let splashed = false;
export function shouldSplash() {
  if (splashed) return false;
  splashed = true;
  return true;
}

/** Сплэш: медленный наезд камеры, пауза, долгое растворение. */
export function Splash({ onDone }: { onDone: () => void }) {
  const op = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1.16, duration: 1900, easing: Easing.out(Easing.quad), useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(1350),
        Animated.timing(op, { toValue: 0, duration: 700, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    ]).start(() => onDone());
  }, []);
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: op, zIndex: 50, backgroundColor: "#FFFFFF" }]}>
      <Animated.Image
        source={require("../assets/hug.png")}
        style={{ width: "100%", height: "100%", transform: [{ scale }] }}
        resizeMode="cover"
      />
    </Animated.View>
  );
}

/** Мягкое проявление: почти без сдвига, с лёгким «вдохом» масштаба. */
export function FadeIn({
  children, delay = 0, y = 8, style,
}: {
  children: React.ReactNode; delay?: number; y?: number; style?: object;
}) {
  const op = useRef(new Animated.Value(0)).current;
  const tr = useRef(new Animated.Value(y)).current;
  const sc = useRef(new Animated.Value(0.985)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 550, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(tr, { toValue: 0, duration: 550, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(sc, { toValue: 1, duration: 550, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[{ opacity: op, transform: [{ translateY: tr }, { scale: sc }] }, style]}>
      {children}
    </Animated.View>
  );
}
