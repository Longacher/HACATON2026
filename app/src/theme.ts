import { StyleSheet } from "react-native";

// Палитра в духе Госуслуг: чистый белый, государственный синий,
// строгий тёмно-синий текст, красный только для срочного.
// Характер оставляем: сургуч-печать, билет, тропа — но в синем.
export const C = {
  bg: "#EDF1F7",
  card: "#FFFFFF",
  ink: "#0B1F33",
  inkSoft: "#3D4E65",
  muted: "#7A8AA0",
  brand: "#0D4CD3",      // гос-синий
  brandDeep: "#09308A",
  brandSoft: "#E2EAFD",
  sun: "#F2A93B",
  night: "#0B1F33",      // ночное небо — deep navy
  teal: "#0D4CD3",
  tealSoft: "#E2EAFD",
  ok: "#1E8E4D",
  line: "#D7E0EE",
  danger: "#E30613",
};

export const S = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg },
  pad: { padding: 18, paddingBottom: 60 },
  card: {
    backgroundColor: C.card, borderRadius: 14, padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: C.line,
    shadowColor: "#0B1F33", shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  hero: { marginHorizontal: -18, marginTop: -18 },
  display: {
    fontSize: 32, lineHeight: 36, color: C.ink,
    fontFamily: "serif", fontWeight: "700", marginVertical: 6,
  },
  displayItalic: {
    fontSize: 32, lineHeight: 36, color: C.brand,
    fontFamily: "serif", fontStyle: "italic", fontWeight: "700",
  },
  h2: { fontSize: 18, fontWeight: "700", color: C.ink, marginVertical: 8 },
  p: { fontSize: 15, color: C.inkSoft, lineHeight: 23 },
  small: { fontSize: 13, color: C.muted, lineHeight: 19 },
  kicker: {
    color: C.brand, fontSize: 12, fontWeight: "700",
    letterSpacing: 2.5, textTransform: "uppercase", marginTop: 12,
  },
  mono: { fontFamily: "monospace" },
  btn: {
    backgroundColor: C.brand, borderRadius: 14, minHeight: 56,
    alignItems: "center", justifyContent: "center", marginTop: 12,
  },
  btnText: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  btnFire: { backgroundColor: C.brand },
  ghost: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: C.brand },
  ghostText: { color: C.brand, fontSize: 16, fontWeight: "700" },
  warn: { backgroundColor: "#FFFFFF", borderWidth: 2, borderColor: C.sun },
  warnText: { color: C.ink, fontSize: 16, fontWeight: "700" },
  input: {
    backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: C.line,
    borderRadius: 10, padding: 13, fontSize: 16, marginVertical: 6, color: C.ink,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginVertical: 8 },
  chip: {
    borderWidth: 1.5, borderColor: "#B9C6DC", backgroundColor: "#FFFFFF",
    borderRadius: 999, paddingVertical: 10, paddingHorizontal: 16,
  },
  chipOn: { borderColor: C.brandDeep, backgroundColor: C.brand },
  chipText: { fontSize: 15, color: C.ink },
  chipTextOn: { color: "#FFFFFF", fontWeight: "700" },
  msg: { paddingVertical: 11, paddingHorizontal: 15, borderRadius: 12, marginVertical: 4, maxWidth: "88%", borderWidth: 1 },
  msgExpert: { backgroundColor: C.brandSoft, borderColor: "#BDD0F5", alignSelf: "flex-start" },
  msgMine: { backgroundColor: "#F1F4FA", borderColor: C.line, alignSelf: "flex-end" },
  crisis: {
    backgroundColor: "#FFF1F1", borderWidth: 1.5, borderColor: C.danger,
    borderRadius: 12, padding: 15, marginBottom: 12,
  },
  badge: {
    backgroundColor: C.brandSoft, color: C.brandDeep, borderRadius: 999,
    paddingVertical: 3, paddingHorizontal: 11, fontSize: 13, overflow: "hidden",
    alignSelf: "flex-start", fontWeight: "700",
  },
  badgeUrgent: { backgroundColor: C.danger, color: "#FFFFFF" },
  nav: { flexDirection: "row", gap: 20, padding: 14, paddingHorizontal: 18, alignItems: "baseline", backgroundColor: C.bg },
  navLogo: { color: C.brandDeep, fontWeight: "700", fontSize: 21, fontFamily: "serif", fontStyle: "italic" },
  navLink: { color: C.inkSoft, fontWeight: "600", fontSize: 14 },
  stampWrap: { alignSelf: "flex-start", transform: [{ rotate: "-7deg" }], marginVertical: 10 },
  stamp: { borderWidth: 2, borderColor: C.brand, borderRadius: 6, paddingVertical: 4, paddingHorizontal: 12 },
  stampText: { color: C.brand, fontWeight: "700", fontSize: 14, letterSpacing: 3 },
  tape: {
    position: "absolute", top: -11, alignSelf: "center",
    width: 92, height: 24, backgroundColor: "#D7E0EE", opacity: 0.9,
    transform: [{ rotate: "-3deg" }], borderLeftWidth: 1, borderRightWidth: 1,
    borderColor: "#B9C6DC",
  },
  ticket: { backgroundColor: C.brandDeep, borderRadius: 6, marginVertical: 12, overflow: "hidden" },
  ticketNum: {
    color: "#FFFFFF", fontSize: 28, fontWeight: "700", letterSpacing: 4,
    textAlign: "center", marginVertical: 4, fontFamily: "monospace",
  },
  ticketSub: { color: "#BDD0F5", fontSize: 12, textAlign: "center", letterSpacing: 1.5 },
  perfRow: { flexDirection: "row", alignItems: "center", marginVertical: 10 },
  perfDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#5A7BD0", marginHorizontal: 3 },
  step: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  dot: { width: 13, height: 13, borderRadius: 7, backgroundColor: "#C3CFE3", marginRight: 11 },
  dotDone: { backgroundColor: C.ok },
  dotNow: { backgroundColor: C.brand, transform: [{ scale: 1.3 }] },
  stepText: { fontSize: 15, color: C.ink },
  stepLabel: { color: C.brand, fontSize: 12, fontWeight: "700", letterSpacing: 2, marginTop: 12 },
  rule: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 10 },
  ruleLine: { flex: 1, height: 1, backgroundColor: C.line },
  ruleText: { fontSize: 12, color: C.muted, letterSpacing: 1.5 },
  // Несмываемая полоса экстренного звонка
  sos: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: C.brandDeep, borderRadius: 16, marginHorizontal: 18,
    marginBottom: 14, minHeight: 60,
  },
  sosText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  sosNum: { color: "#BDD0F5", fontSize: 13, fontWeight: "600" },
});
