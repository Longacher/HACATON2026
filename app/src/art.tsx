import Svg, { Circle, G, Path } from "react-native-svg";
import { C } from "./theme";

/** Трубка для кнопки экстренного звонка. */
export function PhoneIcon({ size = 26 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.3 0 .7-.2 1l-2.3 2.2Z"
        fill="#FFFFFF"
      />
    </Svg>
  );
}

/** Объятие: взрослый держит ребёнка. Абстрактно, в фирменном синем. */
export function Embrace({ width = 360, height = 250 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 360 250">
      <Path d="M0 0 H360 V250 H0 Z" fill="#E2EAFD" />
      {/* взрослый */}
      <Circle cx={150} cy={78} r={34} fill="#0D4CD3" />
      <Path d="M96 250 Q96 150 150 138 Q204 150 204 250 Z" fill="#0D4CD3" />
      {/* ребёнок */}
      <Circle cx={212} cy={140} r={22} fill="#5A7BD0" />
      <Path d="M178 250 Q178 184 212 176 Q246 184 246 250 Z" fill="#5A7BD0" />
      {/* руки взрослого, обнимают */}
      <Path
        d="M104 190 Q150 232 236 208"
        fill="none" stroke="#09308A" strokeWidth={22} strokeLinecap="round"
      />
      <Path
        d="M104 190 Q150 232 236 208"
        fill="none" stroke="#0D4CD3" strokeWidth={15} strokeLinecap="round"
      />
      {/* рука ребёнка */}
      <Path
        d="M196 200 Q214 214 232 208"
        fill="none" stroke="#BDD0F5" strokeWidth={9} strokeLinecap="round"
      />
      {/* тёплые точки-светлячки */}
      <Circle cx={52} cy={52} r={4} fill="#F2A93B" />
      <Circle cx={312} cy={60} r={5} fill="#F2A93B" opacity={0.85} />
      <Circle cx={292} cy={190} r={3.5} fill="#F2A93B" opacity={0.7} />
      <Circle cx={70} cy={180} r={3} fill="#F2A93B" opacity={0.7} />
    </Svg>
  );
}

/** Ночь → рассвет: звёзды и месяц сверху, солнце и письмо снизу. */
export function NightLetter({ width = 360, height = 250 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 360 250">
      <Path d="M0 0 H360 V250 H0 Z" fill={C.night} />
      {/* звёзды — неровная россыпь */}
      <G fill="#F7EFDD">
        <Circle cx={34} cy={30} r={1.8} opacity={0.9} />
        <Circle cx={88} cy={58} r={1.3} opacity={0.6} />
        <Circle cx={140} cy={24} r={2.2} opacity={0.9} />
        <Circle cx={208} cy={48} r={1.4} opacity={0.5} />
        <Circle cx={262} cy={22} r={1.9} opacity={0.8} />
        <Circle cx={318} cy={60} r={1.3} opacity={0.6} />
        <Circle cx={52} cy={96} r={1.4} opacity={0.5} />
        <Circle cx={330} cy={102} r={1.7} opacity={0.7} />
      </G>
      {/* месяц */}
      <Path d="M292 26 a20 20 0 1 0 12 36 a15 15 0 1 1 -12 -36 Z" fill="#F7EFDD" opacity={0.92} />
      {/* солнце наполовину над холмом */}
      <Circle cx={110} cy={196} r={52} fill={C.sun} />
      <Circle cx={110} cy={196} r={68} fill={C.sun} opacity={0.22} />
      <Path d="M0 190 Q70 160 140 182 T360 176 V250 H0 Z" fill={C.bg} />
      {/* письмо — чуть повёрнуто, как живое */}
      <G rotation={-6} origin="250, 190">
        <Path d="M196 150 H304 V226 H196 Z" fill="#FFFCF3" stroke={C.ink} strokeWidth={3} />
        <Path d="M196 150 L250 190 L304 150" fill="none" stroke={C.ink} strokeWidth={3} />
        <Circle cx={250} cy={190} r={11} fill={C.brand} />
        <Circle cx={250} cy={190} r={5.5} fill="#FFFCF3" opacity={0.85} />
      </G>
      {/* птицы */}
      <Path d="M150 84 q7 -9 14 0 M168 74 q7 -9 14 0" stroke="#F7EFDD" strokeWidth={2.5} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

/** Сургучная печать — ставится на готовое письмо. */
export function WaxSeal({ size = 64 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Path
        d="M32 4 L38 10 L46 8 L48 16 L56 18 L54 26 L61 30 L57 37 L61 44 L53 47 L54 55 L46 54 L42 61 L35 57 L28 61 L24 54 L16 55 L17 47 L9 44 L13 37 L9 30 L16 26 L14 18 L22 16 L24 8 L32 4 Z"
        fill={C.brand}
      />
      <Circle cx={32} cy={33} r={15} fill="none" stroke="#FFD9A3" strokeWidth={2} opacity={0.8} />
      <Path d="M26 33 h12 M32 27 v12" stroke="#FFD9A3" strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

/** Пунктирный путь письма — заполнитель пустоты по теме. */
export function DottedPath({ width = 300 }: { width?: number }) {
  return (
    <Svg width={width} height={60} viewBox="0 0 300 60">
      <Path
        d="M8 50 Q70 8 140 34 T292 22"
        fill="none" stroke={C.brand} strokeWidth={2.5}
        strokeDasharray="1 9" strokeLinecap="round" opacity={0.65}
      />
      <G rotation={12} origin="292, 22">
        <Path d="M280 14 H304 V30 H280 Z" fill="#FFFCF3" stroke={C.ink} strokeWidth={2.5} />
        <Path d="M280 14 L292 22 L304 14" fill="none" stroke={C.ink} strokeWidth={2.5} />
      </G>
      <Circle cx={8} cy={50} r={5} fill={C.sun} />
    </Svg>
  );
}

/** Росток — мотив роста и надежды, советуют исследования Chayn. */
export function Sprout({ size = 72 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 72 72">
      <Path d="M14 58 Q36 56 58 58" stroke={C.ink} strokeWidth={3} fill="none" strokeLinecap="round" />
      <Path d="M36 58 L36 30" stroke={C.teal} strokeWidth={3.5} strokeLinecap="round" />
      <Path d="M36 40 Q24 36 20 24 Q32 26 36 40 Z" fill={C.teal} />
      <Path d="M36 34 Q48 30 52 18 Q40 20 36 34 Z" fill={C.teal} opacity={0.65} />
      <Circle cx={52} cy={52} r={3} fill={C.sun} />
      <Circle cx={20} cy={50} r={2.2} fill={C.sun} opacity={0.7} />
    </Svg>
  );
}
export function Squiggle({ width = 300 }: { width?: number }) {
  return (
    <Svg width={width} height={14} viewBox="0 0 300 14">
      <Path
        d="M4 9 Q30 3 55 8 T110 7 T165 9 T220 6 T296 8"
        fill="none" stroke={C.brand} strokeWidth={2.5} strokeLinecap="round" opacity={0.7}
      />
    </Svg>
  );
}

/** Путь письма: извилистая пунктирная тропа со станциями. */
export function Journey({ count = 6, current = 0 }: { count?: number; current?: number }) {
  const H = count * 46;
  const xs = Array.from({ length: count }, (_, i) => 30 + 22 * Math.sin(i * 1.4));
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(0)} ${(i * 46 + 23).toFixed(0)}`).join(" ");
  return (
    <Svg width={90} height={H} viewBox={`0 0 90 ${H}`}>
      <Path d={d} fill="none" stroke={C.line} strokeWidth={2.5} strokeDasharray="2 7" strokeLinecap="round" />
      {xs.map((x, i) => (
        <G key={i}>
          {i === current && <Circle cx={x} cy={i * 46 + 23} r={13} fill={C.brand} opacity={0.18} />}
          <Circle
            cx={x} cy={i * 46 + 23} r={i < current ? 7 : 9}
            fill={i < current ? C.ok : i === current ? C.brand : "#FFFCF3"}
            stroke={i === current ? C.brandDeep : C.line}
            strokeWidth={2}
          />
        </G>
      ))}
    </Svg>
  );
}
