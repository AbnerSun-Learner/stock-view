/** 靶心/十字准线 + 内环 + 指北针箭头；配色对齐品牌稿 #1B365D / #A0B0C0 / #4A90E2 */

interface StillwellMarkProps {
  readonly size?: number;
  readonly variant?: "color" | "inverse";
  readonly className?: string;
}

const PALETTE = {
  navy: "#1B365D",
  inner: "#A0B0C0",
  arrow: "#4A90E2",
} as const;

function StillwellMark({
  size = 28,
  variant = "color",
  className,
}: StillwellMarkProps) {
  const navy = variant === "inverse" ? "#ffffff" : PALETTE.navy;
  const inner =
    variant === "inverse" ? "rgba(255,255,255,0.88)" : PALETTE.inner;
  const arrow = variant === "inverse" ? "#ffffff" : PALETTE.arrow;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      aria-hidden
    >
      {/* 外圈 + 四角刻度 */}
      <circle
        cx="50"
        cy="50"
        r="32"
        fill="none"
        stroke={navy}
        strokeWidth="6"
        strokeLinecap="round"
      />
      <line
        x1="50"
        y1="8"
        x2="50"
        y2="15"
        stroke={navy}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <line
        x1="50"
        y1="85"
        x2="50"
        y2="92"
        stroke={navy}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <line
        x1="8"
        y1="50"
        x2="15"
        y2="50"
        stroke={navy}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <line
        x1="85"
        y1="50"
        x2="92"
        y2="50"
        stroke={navy}
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* 内环 */}
      <circle
        cx="50"
        cy="50"
        r="24"
        fill="none"
        stroke={inner}
        strokeWidth="2.25"
      />
      {/*
        指南针指针：Chevron + 底边正中内凹（倒 V）。
        路径 顶 → 右下 → 底中凹陷点 → 左下 → 闭合；重心位于 (50,50)。
      */}
      <path fill={arrow} d="M 50 31 L 63 62 L 50 57 L 37 62 Z" />
    </svg>
  );
}

export { StillwellMark };
