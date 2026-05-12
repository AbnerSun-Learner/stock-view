"use client";

import { IndicesReactECharts } from "@/components/indices/indices-react-echarts";
import type { IndexValuationPoint } from "@/types/indices";
import * as echarts from "echarts";
import { useMemo } from "react";

interface IndexValuationChartProps {
  series: readonly IndexValuationPoint[];
  windowLabel: string;
}

export function IndexValuationChart({
  series,
  windowLabel,
}: IndexValuationChartProps) {
  const hasPe = useMemo(() => series.some((p) => p.peTtm !== null), [series]);
  const hasPb = useMemo(() => series.some((p) => p.pb !== null), [series]);

  const tickDates = useMemo(() => {
    if (series.length <= 6) return series.map((p) => p.date);
    const step = Math.max(1, Math.floor(series.length / 5));
    const out: string[] = [];
    for (let i = 0; i < series.length; i += step) out.push(series[i].date);
    const last = series[series.length - 1].date;
    if (out[out.length - 1] !== last) out.push(last);
    return out;
  }, [series]);

  const option = useMemo((): echarts.EChartsOption | null => {
    if (!hasPe && !hasPb) return null;

    const dates = series.map((p) => p.date);
    const tickSet = new Set(tickDates);
    const peData = series.map((p) => (p.peTtm === null ? null : p.peTtm)) as (
      | number
      | null
    )[];
    const pbData = series.map((p) => (p.pb === null ? null : p.pb)) as (
      | number
      | null
    )[];

    return {
      legend: {
        bottom: 0,
        textStyle: { color: "var(--foreground)", fontSize: 12 },
      },
      grid: {
        left: 4,
        right: 8,
        top: 8,
        bottom: 36,
        containLabel: true,
      },
      tooltip: {
        trigger: "axis",
        confine: true,
        borderColor: "var(--border-color)",
        backgroundColor: "var(--correlation-card-surface)",
        textStyle: { color: "var(--foreground)", fontSize: 12 },
        formatter: (raw: unknown) => {
          const items = Array.isArray(raw) ? raw : [raw];
          const first = items[0] as { axisValue?: string };
          const label = first?.axisValue ?? "";
          let html = `<div style="font-family:ui-monospace,monospace;font-size:12px;">`;
          html += `<div style="color:var(--muted-foreground);margin-bottom:6px;">${label}</div>`;
          for (const it of items) {
            const row = it as {
              seriesName?: string;
              value?: number | null;
              marker?: string;
            };
            const name = row.seriesName ?? "";
            const v = row.value;
            if (v == null || typeof v !== "number") continue;
            const text =
              name.includes("PE") || name.includes("PE（TTM）")
                ? v.toFixed(2)
                : v.toFixed(3);
            html += `<div style="font-variant-numeric:tabular-nums;margin-top:4px;">${name} ${text}</div>`;
          }
          html += `</div>`;
          return html;
        },
      },
      xAxis: {
        type: "category",
        data: dates,
        boundaryGap: false,
        axisLine: { lineStyle: { color: "var(--muted-foreground)" } },
        axisLabel: {
          color: "var(--muted-foreground)",
          fontSize: 10,
          rotate: 20,
          formatter: (v: string) => (tickSet.has(v) ? v : ""),
        },
      },
      yAxis: [
        ...(hasPe
          ? [
              {
                type: "value" as const,
                position: "left" as const,
                axisLine: { show: false },
                axisTick: { show: false },
                splitLine: {
                  lineStyle: {
                    color: "var(--border-color)",
                    opacity: 0.55,
                    type: "dashed" as const,
                  },
                },
                axisLabel: {
                  color: "var(--muted-foreground)",
                  fontSize: 10,
                  formatter: (val: number) => val.toFixed(1),
                },
              },
            ]
          : []),
        ...(hasPb
          ? [
              {
                type: "value" as const,
                position: "right" as const,
                axisLine: { show: false },
                axisTick: { show: false },
                splitLine: { show: false },
                axisLabel: {
                  color: "var(--muted-foreground)",
                  fontSize: 10,
                  formatter: (val: number) => val.toFixed(2),
                },
              },
            ]
          : []),
      ],
      series: [
        ...(hasPe
          ? [
              {
                type: "line" as const,
                name: "PE（TTM）",
                yAxisIndex: 0,
                data: peData,
                connectNulls: true,
                showSymbol: false,
                smooth: false,
                lineStyle: {
                  width: 1.6,
                  color: "var(--correlation-brand)",
                },
                emphasis: { disabled: true },
              },
            ]
          : []),
        ...(hasPb
          ? [
              {
                type: "line" as const,
                name: "PB",
                yAxisIndex: hasPe ? 1 : 0,
                data: pbData,
                connectNulls: true,
                showSymbol: false,
                smooth: false,
                lineStyle: {
                  width: 1.6,
                  color:
                    "color-mix(in srgb, var(--correlation-brand) 55%, #0d9488)",
                },
                emphasis: { disabled: true },
              },
            ]
          : []),
      ],
    };
  }, [series, hasPe, hasPb, tickDates]);

  if (!hasPe && !hasPb) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-[color:var(--border-color)] bg-[var(--correlation-card-tint)] text-sm text-[var(--muted-foreground)]"
        style={{ height: 300 }}
      >
        暂无估值序列（MOCK）
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] p-4 shadow-[0_14px_36px_color-mix(in_srgb,var(--foreground)_5%,transparent)] md:p-5">
      <p className="text-xs text-[var(--muted-foreground)] mb-3 tracking-wide">
        估值走势 · {windowLabel}（PE / PB 周线 MOCK）
      </p>
      {option ? <IndicesReactECharts height={300} option={option} /> : null}
    </div>
  );
}
