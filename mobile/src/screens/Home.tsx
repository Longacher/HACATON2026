import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, SafeAreaView, Animated, Easing } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { fonts, shadow, useTheme, type Colors } from "../theme";
import { getLastTrack } from "../storage";
import { tap } from "../haptics";
import { apiGet } from "../api/client";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

const TRUST = [
  { t: "Без имени", s: "Не просим имя, телефон, школу" },
  { t: "Номер только у тебя", s: "Без него историю не найти — так задумано" },
  { t: "Фото без следов", s: "Геометки и EXIF чистим автоматически" },
];

function SunIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
      <Circle cx="12" cy="12" r="4.5" />
      <Path d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
    </Svg>
  );
}

function MoonIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </Svg>
  );
}



function FadeIn({ delay = 0, children }: { delay?: number; children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const t = Animated.timing(v, { toValue: 1, duration: 550, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    t.start();
    return () => t.stop();
  }, [v, delay]);
  return (
    <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>
      {children}
    </Animated.View>
  );
}

export default function Home({ navigation }: Props) {
  const { C, scheme, toggle } = useTheme();
  const st = useMemo(() => createStyles(C), [C]);
  const [lastTrack, setLastTrack] = useState<string | null>(null);
  const [helped, setHelped] = useState<number | null>(null);
  const breath = useRef(new Animated.Value(0)).current;

  const [breathLabel, setBreathLabel] = useState("вдох");

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    const id = setInterval(() => setBreathLabel((p) => (p === "вдох" ? "выдох" : "вдох")), 4000);
    return () => { loop.stop(); clearInterval(id); };
  }, [breath]);

  const scale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const glow = breath.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.9] });

  useFocusEffect(
    useCallback(() => {
      getLastTrack().then((t) => setLastTrack(t));
      apiGet<{ helped: number } >("/stats").then((s) => setHelped(s.helped)).catch(() => {});
    }, [])
  );

  return (
    <SafeAreaView style={st.safe}>
      <ScrollView contentContainerStyle={st.container}>
        <FadeIn>
          <View style={st.hero}>
            <View style={st.logoRow}>
              <View style={st.safeBadge}><Text style={st.safeBadgeText}>Анонимно · безопасно</Text></View>
              <Pressable style={st.schemeBtn} onPress={toggle} accessibilityRole="button" accessibilityLabel={scheme === "night" ? "Включить дневной режим" : "Включить ночной режим"}>
                {scheme === "night" ? <SunIcon color={C.tealDeep} /> : <MoonIcon color={C.tealDeep} />}
              </Pressable>
            </View>
            <View style={st.breathWrap}>
              <Animated.View style={[st.breathOuter, { transform: [{ scale }], opacity: glow }]}>
                <View style={st.breathInner} />
              </Animated.View>
              <View style={st.breathTextWrap}>
                <Text style={st.title}>Здесь тебя выслушают</Text>
                <Text style={st.breathLabel}>{breathLabel}… дыши спокойно</Text>
              </View>
            </View>
            <Text style={st.subtitle}>Расскажи о том, что тревожит, своими словами. Профильный специалист ответит бережно и без осуждения.</Text>
            <View style={st.careCard}>
              <Text style={st.careTitle}>Ты не один(а)</Text>
              <Text style={st.careText}>Не нужно представляться. Мы не просим имя, телефон или школу. Только твоя история — и забота в ответ.</Text>
            </View>
          </View>
        </FadeIn>

        <FadeIn delay={120}>
          <Pressable style={st.primary} onPress={() => { tap(); navigation.navigate("Submit", {}); }} accessibilityRole="button" accessibilityLabel="Рассказать о ситуации, занять 2-3 минуты">
            <Text style={st.primaryText}>Рассказать о ситуации</Text>
            <Text style={st.primarySub}>займёт 2–3 минуты · можно без имени</Text>
          </Pressable>
        </FadeIn>

        <FadeIn delay={220}>
          <View style={st.steps}>
            <Text style={st.stepsTitle}>Как это будет?</Text>
            {[
              { n: "1", t: "Пишешь", s: "Своими словами, можно сбивчиво. Без имени." },
              { n: "2", t: "Получаешь номер", s: "Он только у тебя. По нему вернёшься за ответом." },
              { n: "3", t: "Приходит ответ", s: "Специалист напишет бережно, без осуждения." },
            ].map((s, i, arr) => (
              <View key={s.t} style={st.stepRow}>
                <View style={{ alignItems: "center" }}>
                  <View style={st.stepIcon}><Text style={st.stepNum}>{s.n}</Text></View>
                  {i < arr.length - 1 && <View style={st.stepLine} />}
                </View>
                <View style={{ flex: 1, paddingBottom: i < arr.length - 1 ? 14 : 0 }}>
                  <Text style={st.stepTitle}>{s.t}</Text>
                  <Text style={st.stepSub}>{s.s}</Text>
                </View>
              </View>
            ))}
          </View>
        </FadeIn>

        <FadeIn delay={320}>
          <View style={st.trust}>
            <Text style={st.stepsTitle}>Почему это безопасно?</Text>
            {TRUST.map((x) => (
              <View key={x.t} style={st.trustRow}>
                <Text style={st.trustCheck}>✓</Text>
                <View style={{ flex: 1 }}>
                  <Text style={st.stepTitle}>{x.t}</Text>
                  <Text style={st.stepSub}>{x.s}</Text>
                </View>
              </View>
            ))}
            {helped != null && helped > 0 && (
              <View style={st.counter}>
                <Text style={st.counterText}>Уже помогли: {helped}</Text>
              </View>
            )}
          </View>
        </FadeIn>

        {lastTrack ? (
          <FadeIn delay={400}>
            <Pressable style={st.returnCard} onPress={() => navigation.navigate("Track", { initialTrack: lastTrack })} accessibilityRole="button" accessibilityLabel={`Продолжить обращение ${lastTrack}`}>
              <View style={st.returnDot}><Text style={st.returnNum}>№</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={st.returnTitle}>У меня уже есть номер</Text>
                <Text style={st.returnTrack}>{lastTrack} → продолжить</Text>
              </View>
              <Text style={st.returnArrow}>›</Text>
            </Pressable>
          </FadeIn>
        ) : null}
        <Pressable style={st.quietLink} onPress={() => navigation.navigate("Track")}>
          <Text style={st.quietLinkText}>{lastTrack ? "Ввести другой номер" : "У меня уже есть номер →"}</Text>
        </Pressable>

        <Text style={st.privacy}>Номер хранится только на этом устройстве.{"\n"}Дыши спокойно — мы рядом.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (C: Colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { padding: 22, paddingBottom: 36 },
  hero: { marginBottom: 20, backgroundColor: C.surface, borderRadius: 24, padding: 22, borderWidth: 1, borderColor: C.line, overflow: "hidden", ...shadow },
  logoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  schemeBtn: { width: 40, height: 40, borderRadius: 13, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.line, alignItems: "center", justifyContent: "center" },
  safeBadge: { flex: 1, marginRight: 10, alignItems: "center", backgroundColor: C.sageSoft, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: "#cfe3d4" },
  safeBadgeText: { color: C.tealDeep, fontSize: 12, fontWeight: "700" },
  breathWrap: { flexDirection: "row", gap: 14, alignItems: "center" },
  breathOuter: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.tealSoft, borderWidth: 1.5, borderColor: "#bcd9cd", alignItems: "center", justifyContent: "center" },
  breathInner: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.sage },
  breathTextWrap: { flex: 1 },
  title: { fontSize: 26, fontWeight: "800", color: C.ink, lineHeight: 32, letterSpacing: -0.5, fontFamily: fonts.head },
  breathLabel: { fontSize: 12.5, color: C.tealDeep, fontWeight: "700", marginTop: 4, letterSpacing: 0.3 },
  subtitle: { fontSize: 15.5, lineHeight: 23, color: C.muted, marginTop: 12 },
  careCard: { marginTop: 16, backgroundColor: C.sageSoft, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#cfe3d4" },
  careTitle: { fontSize: 14, fontWeight: "800", color: C.tealDeep, marginBottom: 4 },
  careText: { fontSize: 13.5, lineHeight: 20, color: C.ink },
  primary: { backgroundColor: C.btn, paddingVertical: 18, paddingHorizontal: 16, borderRadius: 18, alignItems: "center", marginBottom: 14, ...shadow },
  primaryText: { color: C.onBtn, fontSize: 17, fontWeight: "800", fontFamily: fonts.bold },
  primarySub: { color: C.onBtn, opacity: 0.82, fontSize: 12.5, marginTop: 4 },
  steps: { backgroundColor: C.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: C.line, marginBottom: 12, ...shadow },
  stepsTitle: { fontSize: 15, fontWeight: "800", color: C.ink, marginBottom: 14, fontFamily: fonts.bold },
  stepRow: { flexDirection: "row", gap: 12 },
  stepIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: C.sageSoft, borderWidth: 1, borderColor: "#cfe3d4", alignItems: "center", justifyContent: "center" },
  stepNum: { fontSize: 17, fontWeight: "800", color: C.tealDeep },
  stepLine: { width: 2, flex: 1, minHeight: 14, backgroundColor: C.line, borderRadius: 2, marginVertical: 4 },
  stepTitle: { fontSize: 14.5, fontWeight: "800", color: C.ink },
  stepSub: { fontSize: 13, lineHeight: 19, color: C.muted, marginTop: 3 },
  trust: { backgroundColor: C.sageSoft, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: "#cfe3d4", marginBottom: 12 },
  trustRow: { flexDirection: "row", gap: 10, alignItems: "flex-start", marginBottom: 12 },
  trustCheck: { fontSize: 16, fontWeight: "800", color: C.tealDeep, marginTop: 1 },
  counter: { marginTop: 2, backgroundColor: C.surface, borderRadius: 999, paddingVertical: 9, alignItems: "center", borderWidth: 1, borderColor: "#cfe3d4" },
  counterText: { color: C.tealDeep, fontWeight: "800", fontSize: 13.5 },
  returnCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.surface, borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: "#cfe3d4", marginBottom: 4 },
  returnDot: { width: 42, height: 42, borderRadius: 14, backgroundColor: C.sageSoft, alignItems: "center", justifyContent: "center" },
  returnNum: { fontSize: 18, fontWeight: "800", color: C.tealDeep },
  returnTitle: { fontSize: 14, fontWeight: "800", color: C.ink },
  returnTrack: { fontSize: 13, color: C.tealDeep, fontWeight: "700", letterSpacing: 1, marginTop: 2 },
  returnArrow: { fontSize: 24, color: C.faint, fontWeight: "300" },
  quietLink: { padding: 12, alignItems: "center" },
  quietLinkText: { color: C.muted, fontSize: 14, fontWeight: "600" },
  privacy: { marginTop: 14, textAlign: "center", color: C.muted, fontSize: 13, lineHeight: 19 },
});
