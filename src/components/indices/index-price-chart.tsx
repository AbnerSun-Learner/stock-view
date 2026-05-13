"use client";

import { IndicesReactECharts } from "@/components/indices/indices-react-echarts";
import type { IndexPricePoint } from "@/types/indices";
import * as echarts from "echarts";
import { useMemo, type ReactNode } from "react";

function fmtPrice(n: number): string {
  return n.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function getQuarterLabel(isoDate: string): string {
  const year = isoDate.slice(0, 4);
  const month = Number(isoDate.slice(5, 7));
  if (month === 1) return year;
  return `${month}月`;
}

interface IndexPriceChartProps {
  series: readonly IndexPricePoint[];
  windowLabel: string;
  showDrawdown70: boolean;
  showDrawdown80: boolean;
  controls?: ReactNode;
}

export function IndexPriceChart({
  series,
  windowLabel,
  showDrawdown70,
  showDrawdown80,
  controls,
}: IndexPriceChartProps) {
  const axisTickDates = useMemo(() => {
    const out: string[] = [];
    const seen = new Set<string>();

    for (const point of series) {
      const yearMonth = point.date.slice(0, 7);
      if (seen.has(yearMonth)) continue;
      seen.add(yearMonth);

      const month = Number(point.date.slice(5, 7));
      if ([1, 4, 7, 10].includes(month)) out.push(point.date);
    }

    const maxTicks = 10;
    if (out.length <= maxTicks) return out;

    const step = Math.ceil(out.length / maxTicks);
    return out.filter((_, index) => index % step === 0);
  }, [series]);

  const option = useMemo(() => {
    if (series.length === 0) return null;

    const dates = series.map((p) => p.date);
    const closes = series.map((p) => p.close);
    const tickSet = new Set(axisTickDates);
    const peak = Math.max(...closes);
    const firstClose = closes[0];
    const markLineData: echarts.MarkLineComponentOption["data"] = [];
    const drawdown70Level = Number((peak * 0.3).toFixed(2));
    const drawdown80Level = Number((peak * 0.2).toFixed(2));
    let lowestVisibleLevel: number | null = null;
    if (showDrawdown80) lowestVisibleLevel = drawdown80Level;
    if (!showDrawdown80 && showDrawdown70) lowestVisibleLevel = drawdown70Level;

    if (showDrawdown70) {
      markLineData.push({
        yAxis: drawdown70Level,
        name: "70 水位线",
        lineStyle: {
          color: "#f59e0b",
          width: 1.6,
          type: "dashed",
        },
        label: {
          show: true,
          formatter: "70 水位",
          color: "#92400e",
          backgroundColor: "rgba(255, 251, 235, 0.92)",
          borderColor: "#f59e0b",
          borderWidth: 1,
          borderRadius: 8,
          padding: [3, 7],
          fontSize: 11,
          fontWeight: 700,
          position: "insideEndTop",
        },
      });
    }

    if (showDrawdown80) {
      markLineData.push({
        yAxis: drawdown80Level,
        name: "80 水位线",
        lineStyle: {
          color: "#ef4444",
          width: 1.6,
          type: "dashed",
        },
        label: {
          show: true,
          formatter: "80 水位",
          color: "#991b1b",
          backgroundColor: "rgba(254, 242, 242, 0.92)",
          borderColor: "#ef4444",
          borderWidth: 1,
          borderRadius: 8,
          padding: [3, 7],
          fontSize: 11,
          fontWeight: 700,
          position: "insideEndTop",
        },
      });
    }

    return {
      grid: {
        left: 8,
        right: 16,
        top: 18,
        bottom: 28,
        containLabel: true,
      },
      tooltip: {
        trigger: "axis",
        confine: true,
        showContent: true,
        axisPointer: {
          type: "cross",
          label: {
            show: true,
            backgroundColor:
              "color-mix(in srgb, var(--correlation-brand) 36%, var(--correlation-card-surface))",
            color: "var(--foreground)",
            fontSize: 11,
          },
          crossStyle: {
            color:
              "color-mix(in srgb, var(--muted-foreground) 62%, transparent)",
            type: "dashed",
          },
          lineStyle: {
            color:
              "color-mix(in srgb, var(--muted-foreground) 62%, transparent)",
            type: "dashed",
          },
        },
        borderColor: "var(--border-color)",
        backgroundColor: "var(--correlation-card-surface)",
        extraCssText:
          "box-shadow:0 18px 42px rgba(15,23,42,0.12);border-radius:10px;padding:12px 14px;",
        textStyle: {
          color: "var(--foreground)",
          fontSize: 12,
        },
        formatter: (raw: unknown) => {
          const items = Array.isArray(raw) ? raw : [raw];
          const p = items[0] as {
            axisValue?: string;
            dataIndex?: number;
            value?: number;
          };
          const date = p?.axisValue ?? "";
          const value = p?.value;
          const index = typeof p?.dataIndex === "number" ? p.dataIndex : -1;
          if (typeof value !== "number") return "";
          const runningPeak =
            index >= 0 ? Math.max(...closes.slice(0, index + 1)) : peak;
          const cumulative = (value / firstClose - 1) * 100;
          const drawdown = (value / runningPeak - 1) * 100;
          const cumulativeColor =
            cumulative >= 0 ? "var(--loss)" : "var(--profit)";
          const drawdownColor = drawdown >= 0 ? "var(--loss)" : "var(--profit)";

          let html = `<div style="font-size:12px;min-width:170px;">`;
          html += `<div style="display:flex;align-items:center;gap:8px;font-weight:700;color:var(--foreground);margin-bottom:8px;"><span style="width:8px;height:8px;border-radius:999px;background:var(--correlation-brand);display:inline-block;"></span>${date}</div>`;
          html += `<div style="font-variant-numeric:tabular-nums;color:var(--muted-foreground);">收盘价：<strong style="color:var(--foreground);">${fmtPrice(
            value
          )}</strong></div>`;
          html += `<div style="font-variant-numeric:tabular-nums;margin-top:4px;color:var(--muted-foreground);">累计涨跌：<strong style="color:${cumulativeColor};">${fmtPct(
            cumulative
          )}</strong></div>`;
          html += `<div style="font-variant-numeric:tabular-nums;margin-top:4px;color:var(--muted-foreground);">距前高下跌：<strong style="color:${drawdownColor};">${fmtPct(
            drawdown
          )}</strong></div>`;
          html += `</div>`;
          return html;
        },
      },
      xAxis: {
        type: "category",
        data: dates,
        boundaryGap: false,
        axisLine: { lineStyle: { color: "var(--muted-foreground)" } },
        axisTick: { show: false },
        axisLabel: {
          color: "var(--muted-foreground)",
          fontSize: 10,
          rotate: 0,
          interval: 0,
          formatter: (v: string) => (tickSet.has(v) ? getQuarterLabel(v) : ""),
        },
      },
      yAxis: [
        {
          type: "value",
          position: "left",
          scale: true,
          min:
            lowestVisibleLevel === null
              ? undefined
              : ({ min }: { min: number }) =>
                  Math.floor(Math.min(min, lowestVisibleLevel) * 0.95),
          axisLine: {
            show: true,
            lineStyle: { color: "var(--border-color)" },
          },
          axisTick: { show: false },
          splitLine: {
            lineStyle: {
              color: "var(--border-color)",
              opacity: 0.48,
            },
          },
          axisLabel: {
            color: "var(--muted-foreground)",
            fontSize: 10,
            formatter: (val: number) =>
              val >= 1000
                ? `${Number((val / 1000).toFixed(1))}K`
                : val.toLocaleString("zh-CN", { maximumFractionDigits: 0 }),
          },
        },
        {
          type: "value",
          position: "right",
          scale: true,
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: {
            color: "var(--muted-foreground)",
            fontSize: 10,
            formatter: (val: number) =>
              val >= 1000
                ? `${Number((val / 1000).toFixed(1))}K`
                : val.toLocaleString("zh-CN", { maximumFractionDigits: 0 }),
          },
        },
      ],
      series: [
        {
          type: "line",
          name: "收盘",
          yAxisIndex: 0,
          data: closes,
          showSymbol: false,
          smooth: false,
          lineStyle: {
            width: 1.8,
            color: "var(--correlation-brand)",
          },
          itemStyle: { color: "var(--correlation-brand)" },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              {
                offset: 0,
                color:
                  "color-mix(in srgb, var(--correlation-brand) 14%, transparent)",
              },
              { offset: 1, color: "rgba(255,255,255,0)" },
            ]),
          },
          emphasis: { disabled: true },
          markLine:
            markLineData.length > 0
              ? {
                  silent: true,
                  symbol: "none",
                  data: markLineData,
                }
              : undefined,
        },
      ],
    } satisfies echarts.EChartsOption;
  }, [series, axisTickDates, showDrawdown70, showDrawdown80]);

  if (series.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-[color:var(--border-color)] bg-[var(--correlation-card-tint)] text-sm text-[var(--muted-foreground)]"
        style={{ height: 320 }}
      >
        TuShare 暂无可用收盘价序列
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] p-4 shadow-[0_14px_36px_color-mix(in_srgb,var(--foreground)_5%,transparent)] md:p-5">
      <div className="mb-4 space-y-3">
        <h2 className="text-lg font-medium tracking-wide text-[var(--foreground)]">
          价格指数走势
        </h2>
        {controls ? (
          <div className="flex justify-center overflow-x-auto pb-1">
            {controls}
          </div>
        ) : null}
        <p className="text-xs text-[var(--muted-foreground)] tracking-wide">
          价格指数收盘 · {windowLabel}（TuShare 日线）
        </p>
      </div>
      {option ? <IndicesReactECharts height={380} option={option} /> : null}
      <p className="mt-3 text-[10px] leading-relaxed text-[var(--muted-foreground)]">
        收盘点位来自 TuShare 指数日线，收益与回撤基于当前可视序列计算。
      </p>
    </div>
  );
}
