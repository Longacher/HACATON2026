import React, { useEffect, useMemo, useRef } from "react";
import { View, Text, StyleSheet, SafeAreaView, Pressable, Share, Animated, Easing } from "react-native";
import * as Clipboard from "expo-clipboard";
import QRCode from "react-native-qrcode-svg";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { trackLink, type RootStackParamList } from "../../App";
import { fonts, shadow, useTheme, type Colors } from "../theme";
import { saveLastTrack } from "../storage";
import { isNotifySupported, scheduleCheckReminder } from "../notify";

type Props = NativeStackScreenProps<RootStackParamList, "Result">;

export default function Result({ navigation, route }: Props) {
  const { trackNumber } = route.params;
  const { C } = useTheme();
  const st = useMemo(() => createStyles(C), [C]);
  useEffect(() => {
    saveLastTrack(trackNumber);
    if (isNotifySupported()) scheduleCheckReminder(trackNumber);
  }, [trackNumber]);

  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const beat = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.18, 1] });

  const link = trackLink(trackNumber);
  const share = () =>
    Share.share({ message: `Мой номер обращения в «Отклике»: ${trackNumber}\nВернуться за ответом: ${link}` });

  return (
    <SafeAreaView style={st.safe}>
      <View style={st.container}>
        <View style={st.card}>
          <Animated.View style={{ transform: [{ scale: beat }] }}>
            <Text style={st.emoji}>💚</Text>
          </Animated.View>
          <Text style={st.title}>Спасибо за доверие</Text>
          <Text style={st.subtitle}>Мы получили твою историю и уже ищем бережного специалиста. Ты большой молодец, что написал(а).</Text>
          <Text style={st.label}>Твой тайный номер — сохрани его:</Text>
          <View style={st.trackBox}><Text style={st.trackText} selectable>{trackNumber}</Text></View>
          <Text style={st.hint}>🔒 Мы сохранили его на этом устройстве — на главной появится кнопка «продолжить». Без него найти историю нельзя — так устроена анонимность.</Text>

          <View style={st.qrWrap}>
            <QRCode value={link} size={150} color="#245F5D" backgroundColor="#fff" />
            <Text style={st.qrHint}>Наведи камерой с другого устройства — откроется это обращение</Text>
          </View>

          <Pressable style={st.primary} onPress={() => Clipboard.setStringAsync(trackNumber)} accessibilityRole="button" accessibilityLabel="Скопировать номер обращения">
            <Text style={st.primaryText}>📋 Скопировать номер</Text>
          </Pressable>
          <Pressable style={st.shareBtn} onPress={share} accessibilityRole="button" accessibilityLabel="Поделиться номером обращения">
            <Text style={st.shareText}>↗ Отправить себе (мессенджер, почта, заметки)</Text>
          </Pressable>
          <Pressable style={st.secondary} onPress={() => navigation.replace("Track", { initialTrack: trackNumber })} accessibilityRole="button" accessibilityLabel="Перейти к ожиданию ответа">
            <Text style={st.secondaryText}>Перейти к ожиданию ответа →</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (C: Colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { padding: 22, flex: 1, justifyContent: "center" },
  card: { backgroundColor: C.surface, borderRadius: 26, padding: 26, borderWidth: 1, borderColor: C.line, alignItems: "center", ...shadow },
  emoji: { fontSize: 52, marginBottom: 10 },
  title: { fontSize: 24, fontWeight: "800", color: C.ink, textAlign: "center", fontFamily: fonts.head },
  subtitle: { fontSize: 15, color: C.muted, marginTop: 8, marginBottom: 20, textAlign: "center", lineHeight: 22 },
  label: { fontSize: 13, color: C.muted, marginBottom: 10, fontWeight: "700" },
  trackBox: { backgroundColor: C.tealSoft, borderRadius: 16, padding: 18, alignItems: "center", borderWidth: 1.5, borderColor: C.teal, borderStyle: "dashed", width: "100%" },
  trackText: { fontSize: 23, letterSpacing: 2.5, fontWeight: "800", color: C.tealDeep, fontFamily: fonts.bold },
  hint: { fontSize: 12.5, color: C.muted, marginTop: 12, textAlign: "center", lineHeight: 18 },
  qrWrap: { alignItems: "center", marginTop: 18, backgroundColor: "#fff", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: C.line },
  qrHint: { fontSize: 12, color: "#5a6a6a", marginTop: 10, textAlign: "center", maxWidth: 220, lineHeight: 17 },
  primary: { backgroundColor: C.btn, padding: 16, borderRadius: 14, alignItems: "center", marginTop: 16, width: "100%" },
  primaryText: { color: C.onBtn, fontWeight: "800", fontSize: 15, fontFamily: fonts.bold },
  shareBtn: { padding: 13, alignItems: "center", marginTop: 4 },
  shareText: { color: C.tealDeep, fontWeight: "700", fontSize: 14 },
  secondary: { padding: 12, alignItems: "center" },
  secondaryText: { color: C.tealDeep, fontWeight: "700", fontSize: 14 },
});
