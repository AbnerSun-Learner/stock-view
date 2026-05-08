"use client";

import type { CorrelationSummary } from "@/types/correlation";

interface CorrelationSummaryCardProps {
  summary: CorrelationSummary;
  generatedAt: string;
}

function formatScore(score: number | null): string {
  if (score === null) return "—";
  return score.toFixed(2);
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
  } catch {
    return iso;
  }
}

export function CorrelationSummaryCard({
  summary,
  generatedAt,
}: CorrelationSummaryCardProps) {
  const { headline, completePairs, partialPairs, unavailablePairs } = summary;

  return (
    <div className="border border-[color:var(--border-color)] p-6 md:p-8">
      <p className="text-xs font-medium tracking-[0.18em] uppercase text-[var(--muted-foreground)] mb-3">
        Overall Reading
      </p>
      <h2 className="text-2xl md:text-3xl font-light tracking-[-0.01em] text-[var(--foreground)] mb-6">
        {headline}
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6">
        <SummaryStat label="最高综合分" value={formatScore(summary.maxFinalScore)} />
        <SummaryStat label="平均综合分" value={formatScore(summary.averageFinalScore)} />
        <SummaryStat label="高重复风险组合" value={`${summary.highRiskPairs} 对`} />
        <SummaryStat
          label="完整 / 部分 / 不可用"
          value={`${completePairs} / ${partialPairs} / ${unavailablePairs}`}
        />
      </div>

      {summary.topRiskPair && summary.maxFinalScore !== null ? (
        <div className="mt-6 pt-6 border-t border-[color:var(--border-color)] flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <p className="text-sm text-[var(--muted-foreground)]">
            最高重复风险：
            <span className="ml-2 font-mono text-[var(--foreground)]">
              {summary.topRiskPair[0]} ↔ {summary.topRiskPair[1]}
            </span>
            <span className="ml-3 text-[var(--foreground)]">
              综合分 {formatScore(summary.maxFinalScore)}
            </span>
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            生成于 {formatTimestamp(generatedAt)}
          </p>
        </div>
      ) : (
        <div className="mt-6 pt-6 border-t border-[color:var(--border-color)]">
          <p className="text-xs text-[var(--muted-foreground)]">
            生成于 {formatTimestamp(generatedAt)}
          </p>
        </div>
      )}
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium tracking-[0.16em] uppercase text-[var(--muted-foreground)] mb-2">
        {label}
      </p>
      <p className="text-xl md:text-2xl font-light text-[var(--foreground)] font-mono tabular-nums">
        {value}
      </p>
    </div>
  );
}
