/** 极简品牌标：实心圆，与顶栏字标同色（currentColor） */

interface StillwellMarkProps {
  readonly size?: number;
  readonly variant?: "color" | "inverse";
  readonly className?: string;
}

function StillwellMark({
  size = 20,
  variant = "color",
  className,
}: StillwellMarkProps) {
  const fill = variant === "inverse" ? "#ffffff" : "var(--foreground)";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      width={size}
      height={size}
      className={className}
      aria-hidden
    >
      <circle cx="10" cy="10" r="10" fill={fill} />
    </svg>
  );
}

export { StillwellMark };
