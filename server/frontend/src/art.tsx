export function NightLetter({ w = 560, h = 250 }: { w?: number; h?: number }) {
  return (
    <svg width="100%" height={h} viewBox="0 0 360 250" preserveAspectRatio="xMidYMid slice">
      <path d="M0 0 H360 V250 H0 Z" fill="#0B1F33" />
      <g fill="#EDF1F7">
        <circle cx={34} cy={30} r={1.8} opacity={0.9} />
        <circle cx={88} cy={58} r={1.3} opacity={0.6} />
        <circle cx={140} cy={24} r={2.2} opacity={0.9} />
        <circle cx={208} cy={48} r={1.4} opacity={0.5} />
        <circle cx={262} cy={22} r={1.9} opacity={0.8} />
        <circle cx={318} cy={60} r={1.3} opacity={0.6} />
        <circle cx={52} cy={96} r={1.4} opacity={0.5} />
        <circle cx={330} cy={102} r={1.7} opacity={0.7} />
      </g>
      <path d="M292 26 a20 20 0 1 0 12 36 a15 15 0 1 1 -12 -36 Z" fill="#EDF1F7" opacity={0.92} />
      <circle cx={110} cy={196} r={68} fill="#F2A93B" opacity={0.22} />
      <circle cx={110} cy={196} r={52} fill="#F2A93B" />
      <path d="M0 190 Q70 160 140 182 T360 176 V250 H0 Z" fill="#EDF1F7" />
      <g transform="rotate(-6 250 190)">
        <path d="M196 150 H304 V226 H196 Z" fill="#FFFFFF" stroke="#0B1F33" strokeWidth={3} />
        <path d="M196 150 L250 190 L304 150" fill="none" stroke="#0B1F33" strokeWidth={3} />
        <circle cx={250} cy={190} r={11} fill="#0D4CD3" />
        <circle cx={250} cy={190} r={5.5} fill="#FFFFFF" opacity={0.85} />
      </g>
      <path d="M150 84 q7 -9 14 0 M168 74 q7 -9 14 0" stroke="#EDF1F7" strokeWidth={2.5} fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function WaxSeal({ s = 76 }: { s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 64 64">
      <path
        d="M32 4 L38 10 L46 8 L48 16 L56 18 L54 26 L61 30 L57 37 L61 44 L53 47 L54 55 L46 54 L42 61 L35 57 L28 61 L24 54 L16 55 L17 47 L9 44 L13 37 L9 30 L16 26 L14 18 L22 16 L24 8 L32 4 Z"
        fill="#0D4CD3"
      />
      <circle cx={32} cy={33} r={15} fill="none" stroke="#BDD0F5" strokeWidth={2} opacity={0.9} />
      <path d="M26 33 h12 M32 27 v12" stroke="#BDD0F5" strokeWidth={2.5} strokeLinecap="round" />
    </svg>
  );
}
