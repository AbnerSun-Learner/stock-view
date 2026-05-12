"use client";

function clamp01(n: number): number {
  return Math.min(100, Math.max(0, n));
}

function SemicircleGauge({
  value,
  caption,
}: {
  value: number | null;
  caption: string;
}) {
  const r = 52;
  const cx = 60;
  const cy = 58;
  const arcLen = Math.PI * r;
  const pct = value === null ? 0 : clamp01(value);
  const dash = (pct / 100) * arcLen;

  return (
    <div className="flex flex-col items-center justify-center min-w-[7.5rem]">
      <svg
        width="120"
        height="72"
        viewBox="0 0 120 72"
        className="shrink-0"
        aria-hidden
      >
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="color-mix(in srgb, var(--border-color) 90%, transparent)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {value !== null ? (
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke="var(--correlation-brand)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${arcLen}`}
          />
        ) : null}
      </svg>
      <p className="mt-[-6px] text-lg font-mono tabular-nums text-[var(--foreground)]">
        {value === null ? "—" : `${value.toFixed(1)}`}
      </p>
      <p className="text-[10px] text-[var(--muted-foreground)] mt-1 text-center leading-snug max-w-[8rem]">
        {caption}
      </p>
    </div>
  );
}

function WaterLevelMeter({
  value,
  subtitle,
}: {
  value: number | null;
  subtitle: string;
}) {
  const pct = value === null ? 0 : clamp01(value);

  return (
    <div className="flex-1 min-w-0 min-h-[92px] flex flex-col">
      <p className="text-[11px] text-[var(--muted-foreground)] mb-2">
        {subtitle}
      </p>
      <div className="relative flex-1 min-h-[68px] rounded-lg border border-[color:var(--border-color)] bg-[var(--correlation-card-tint)] overflow-hidden flex items-center">
        <div
          className="absolute bottom-0 left-0 right-0 rounded-b-lg bg-gradient-to-t from-[color-mix(in_srgb,var(--correlation-brand)_48%,transparent)] to-[color-mix(in_srgb,var(--correlation-brand)_22%,transparent)] transition-[height] duration-300 ease-out"
          style={{ height: `${pct}%` }}
        />
        <div className="relative z-[1] w-full px-3 py-2 flex items-center justify-between gap-3">
          <span className="text-xs font-mono tabular-nums text-[var(--foreground)]">
            {value === null ? "—" : `${value.toFixed(1)}`}
            <span className="opacity-65 ml-1">/ 100</span>
          </span>
          <span className="text-[10px] text-[var(--muted-foreground)] shrink-0">
            水位
          </span>
        </div>
      </div>
    </div>
  );
}

interface IndexPercentileWidgetsProps {
  /** 0–100 */
  gaugePePercentile: number | null;
  gaugePbPercentile: number | null;
}

export function IndexPercentileWidgets({
  gaugePePercentile,
  gaugePbPercentile,
}: IndexPercentileWidgetsProps) {
  const peAbsent = gaugePePercentile === null;
  const pbAbsent = gaugePbPercentile === null;

  return (
    <section className="rounded-xl border border-[color:var(--border-color)] bg-[var(--correlation-card-tint)] p-5 md:p-6 space-y-5">
      <div>
        <h2 className="text-lg font-medium text-[var(--foreground)] tracking-wide">
          PE / PB 估值分位
        </h2>
        <p className="text-xs text-[var(--muted-foreground)] mt-1">
          仪表盘与水位图均为 <span className="font-mono">0–100</span>{" "}
          分位（MOCK，接入后以统一历史样本为准）。
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-stretch gap-4 sm:gap-6 border-b border-[color:var(--border-color)] pb-5">
        <SemicircleGauge
          value={gaugePePercentile}
          caption="PE 分位仪表盘（0–100）"
        />
        <WaterLevelMeter
          value={gaugePePercentile}
          subtitle={peAbsent ? "PE 分位暂无" : "PE 历史分位 · 水位"}
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-stretch gap-4 sm:gap-6">
        <SemicircleGauge
          value={gaugePbPercentile}
          caption="PB 分位仪表盘（0–100）"
        />
        <WaterLevelMeter
          value={gaugePbPercentile}
          subtitle={pbAbsent ? "PB 分位暂无" : "PB 历史分位 · 水位"}
        />
      </div>
    </section>
  );
}
