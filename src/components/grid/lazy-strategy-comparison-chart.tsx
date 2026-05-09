"use client";

import dynamic from "next/dynamic";

/**
 * 策略对比图为 Recharts 重模块，按需加载避免进入 grid 首包。
 */
export const LazyStrategyComparisonChart = dynamic(
  () =>
    import("@/components/grid/strategy-comparison-chart").then((m) => ({
      default: m.StrategyComparisonChart,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex min-h-[360px] items-center justify-center text-sm text-[var(--muted-foreground)]"
        style={{ letterSpacing: "0.03em" }}
      >
        加载图表…
      </div>
    ),
  }
);
