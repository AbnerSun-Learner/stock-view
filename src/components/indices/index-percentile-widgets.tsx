"use client";

import { IndicesReactECharts } from "@/components/indices/indices-react-echarts";
import * as echarts from "echarts";
import { useMemo } from "react";

function clamp01(n: number): number {
  return Math.min(100, Math.max(0, n));
}

function PercentileGauge({
  value,
  caption,
  accent,
}: {
  value: number | null;
  caption: string;
  accent: "brand" | "teal";
}) {
  const pct = value === null ? 0 : clamp01(value);
  const aria =
    value === null
      ? `${caption}，暂无数据`
      : `${caption}，当前读数 ${value.toFixed(1)}，满分一百`;
  const detailFormatter = value === null ? "—" : "{value}";

  const fill =
    value === null
      ? "color-mix(in srgb, var(--muted-foreground) 38%, transparent)"
      : accent === "teal"
      ? "#0e7490"
      : "var(--correlation-brand)";

  const option = useMemo(
    (): echarts.EChartsOption => ({
      animation: false,
      tooltip: { show: false },
      series: [
        {
          type: "gauge",
          startAngle: 210,
          endAngle: -30,
          min: 0,
          max: 100,
          splitNumber: 2,
          radius: "86%",
          center: ["50%", "50%"],
          axisLine: {
            roundCap: true,
            lineStyle: {
              width: 10,
              color: [
                [1, "color-mix(in srgb, var(--border-color) 90%, transparent)"],
              ],
            },
          },
          progress: {
            show: true,
            width: 10,
            roundCap: true,
            itemStyle: { color: fill },
          },
          pointer: {
            show: true,
            length: "62%",
            width: 4,
            itemStyle: { color: fill },
          },
          axisTick: {
            show: true,
            distance: -12,
            length: 3,
            lineStyle: {
              color: "var(--muted-foreground)",
              width: 1,
              opacity: 0.45,
            },
          },
          splitLine: {
            show: true,
            distance: -14,
            length: 6,
            lineStyle: {
              color: "var(--muted-foreground)",
              width: 1,
              opacity: 0.55,
            },
          },
          axisLabel: {
            show: true,
            distance: -4,
            color: "var(--muted-foreground)",
            fontSize: 10,
            formatter: (v: number) =>
              [0, 50, 100].includes(v) ? String(v) : "",
          },
          anchor: {
            show: true,
            showAbove: true,
            size: 7,
            itemStyle: {
              color: "var(--correlation-card-surface)",
              borderColor: fill,
              borderWidth: 2,
            },
          },
          title: { show: false },
          detail: {
            show: true,
            valueAnimation: false,
            offsetCenter: [0, "58%"],
            color: "var(--foreground)",
            fontSize: 20,
            fontFamily: "var(--font-mono)",
            formatter: detailFormatter,
          },
          emphasis: { disabled: true },
          data: [{ value: pct }],
        },
      ],
    }),
    [pct, fill, detailFormatter]
  );

  return (
    <div
      className="flex flex-col items-center justify-center min-w-0"
      role="img"
      aria-label={aria}
    >
      <div className="w-full max-w-[12.5rem] mx-auto">
        <IndicesReactECharts height={158} option={option} />
      </div>
      <p className="text-[11px] text-[var(--muted-foreground)] mt-1 text-center leading-snug">
        {caption}
      </p>
    </div>
  );
}

interface IndexPercentileWidgetsProps {
  gaugePePercentile: number | null;
  gaugePbPercentile: number | null;
  isEmbedded?: boolean;
}

export function IndexPercentileWidgets({
  gaugePePercentile,
  gaugePbPercentile,
  isEmbedded = false,
}: IndexPercentileWidgetsProps) {
  const content = (
    <>
      {isEmbedded ? null : (
        <div>
          <h2 className="text-lg font-medium text-[var(--foreground)] tracking-wide">
            PE / PB 估值分位
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            仪表盘数值范围为 <span className="font-mono">0–100</span>{" "}
            历史分位；由 ECharts gauge 绘制。
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <PercentileGauge
          value={gaugePePercentile}
          caption="PE 分位仪表盘（0–100）"
          accent="brand"
        />
        <PercentileGauge
          value={gaugePbPercentile}
          caption="PB 分位仪表盘（0–100）"
          accent="teal"
        />
      </div>
    </>
  );

  if (isEmbedded) return <div className="space-y-4">{content}</div>;

  return (
    <section className="rounded-2xl border border-[color:var(--border-color)] bg-[var(--correlation-card-tint)] p-5 md:p-6 space-y-5 shadow-[0_14px_36px_color-mix(in_srgb,var(--foreground)_5%,transparent)]">
      {content}
    </section>
  );
}
