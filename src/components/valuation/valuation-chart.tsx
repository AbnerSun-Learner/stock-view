"use client";

import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { LineChart as ELineChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  MarkAreaComponent,
  MarkLineComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { useMemo } from "react";
import type { EChartsOption } from "echarts";

echarts.use([
  ELineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  MarkAreaComponent,
  MarkLineComponent,
  CanvasRenderer,
]);

function resolveCssColor(input: string): string {
  if (typeof window === "undefined") return input;
  const match = input.match(/^var\((--[^)]+)\)$/);
  if (!match) return input;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(match[1])
    .trim();
  return value || input;
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.trim();
  if (!normalized.startsWith("#")) return normalized;
  const raw = normalized.slice(1);
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  if (full.length !== 6) return normalized;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
}

export interface ValuationPoint {
  date: string;
  value: number;
  close?: number;
  pb?: number | null;
}

interface ValuationChartProps {
  data: ValuationPoint[];
  theme?: "light" | "dark";
  showDropZones?: boolean;
  /** 是否显示估值带（由父组件如 PE 模块内开关控制） */
  showBands?: boolean;
  hideStatsBar?: boolean;
  chartHeaderRight?: React.ReactNode;
}

function computeBands(data: ValuationPoint[]) {
  if (!data.length) return null;
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const tenYearsCount = Math.min(120, data.length);
  const recentValues = values.slice(-tenYearsCount);
  const median =
    recentValues.reduce((a, b) => a + b, 0) / recentValues.length;

  const rangeBelow = median - min;
  const rangeAbove = max - median;
  const b2 = min + rangeBelow * 0.25;
  const b3 = min + rangeBelow * 0.5;
  const b4 = min + rangeBelow * 0.75;
  const t1 = median + rangeAbove * 0.25;
  const t2 = median + rangeAbove * 0.5;
  const t3 = median + rangeAbove * 0.75;

  return {
    min,
    max,
    median,
    bands: [
      { y1: min, y2: b2, color: "rgba(220,252,231,0.5)", label: "大买" },
      { y1: b2, y2: b3, color: "rgba(187,247,208,0.5)", label: "中买" },
      { y1: b3, y2: b4, color: "rgba(134,239,172,0.5)", label: "小买" },
      { y1: b4, y2: median, color: "rgba(254,249,195,0.5)", label: "不买不卖" },
      { y1: median, y2: t1, color: "rgba(254,249,195,0.5)", label: "不买不卖" },
      { y1: t1, y2: t2, color: "rgba(254,215,170,0.5)", label: "小卖" },
      { y1: t2, y2: t3, color: "rgba(253,186,116,0.5)", label: "中卖" },
      { y1: t3, y2: max, color: "rgba(249,115,22,0.5)", label: "大卖" },
    ],
  };
}

function buildDateIndex(data: ValuationPoint[]): Map<number, number> {
  const map = new Map<number, number>();
  for (let i = 0; i < data.length; i++) {
    map.set(new Date(data[i].date).getTime(), i);
  }
  return map;
}

function findClosestIndex(
  dateIndex: Map<number, number>,
  timestamps: number[],
  ts: number
): number {
  const exact = dateIndex.get(ts);
  if (exact !== undefined) return exact;
  let best = 0
  let bestDiff = Infinity
  for (const t of timestamps) {
    const diff = Math.abs(t - ts)
    if (diff < bestDiff) {
      bestDiff = diff
      best = dateIndex.get(t) ?? 0
    }
  }
  return best;
}

export function ValuationChart({
  data,
  theme = "light",
  showDropZones = false,
  showBands = false,
  hideStatsBar = false,
  chartHeaderRight,
}: ValuationChartProps) {
  const bands = useMemo(() => computeBands(data), [data]);

  const hasClose = useMemo(
    () => data.some((d) => typeof d.close === "number"),
    [data]
  );

  const closeRange = useMemo(() => {
    if (!hasClose) return null;
    const closes = data
      .map((d) => d.close)
      .filter((c): c is number => typeof c === "number");
    if (!closes.length) return null;
    const high = Math.max(...closes);
    const low = Math.min(...closes);
    return { high, low, drop70: high * 0.3, drop80: high * 0.2 };
  }, [data, hasClose]);

  const stats = useMemo(() => {
    if (!bands || !data.length) return null;
    const values = data.map((d) => d.value);
    const currentPe = values[values.length - 1];
    const sorted = [...values].sort((a, b) => a - b);
    const rank = sorted.filter((v) => v <= currentPe).length;
    const percentile =
      values.length > 0 ? Math.round((rank / values.length) * 100) : 0;
    return {
      high: bands.max,
      low: bands.min,
      median: bands.median,
      currentPe,
      percentile,
    };
  }, [data, bands]);

  const dateIndex = useMemo(() => buildDateIndex(data), [data]);
  const timestamps = useMemo(
    () => data.map((d) => new Date(d.date).getTime()),
    [data]
  );

  const option = useMemo<EChartsOption>(() => {
    if (!data.length || !bands || !stats) return {};

    const peTimeData = data.map((d) => [d.date, d.value]);
    const closeTimeData = data.map((d) => [
      d.date,
      typeof d.close === "number" ? d.close : null,
    ]);

    const reducedMotion = prefersReducedMotion();
    const isDark = theme === "dark";
    const textColor = resolveCssColor("var(--foreground)");
    const mutedColor = resolveCssColor("var(--muted-foreground)");
    const gridColor = resolveCssColor("var(--border-color)");
    const brandColor = resolveCssColor("var(--brand)");
    const primaryColor = resolveCssColor("var(--primary)");
    const secondaryColor = resolveCssColor("var(--chart-secondary)");
    const lossColor = resolveCssColor("var(--loss)");
    const profitColor = resolveCssColor("var(--profit)");
    const warningColor = resolveCssColor("var(--warning)");
    const accentColor = resolveCssColor("var(--accent)");

    const bandColors = [
      hexToRgba(profitColor, 0.18),
      hexToRgba(profitColor, 0.26),
      hexToRgba(profitColor, 0.34),
      hexToRgba(warningColor, 0.16),
      hexToRgba(warningColor, 0.16),
      hexToRgba(accentColor, 0.18),
      hexToRgba(accentColor, 0.28),
      hexToRgba(accentColor, 0.38),
    ];
    const tooltipBg = hexToRgba(resolveCssColor("var(--card-bg)"), isDark ? 0.94 : 0.96);

    const bandMarkArea = bands.bands.map((b, idx) => [
      { yAxis: b.y1, itemStyle: { color: bandColors[idx] ?? b.color } },
      { yAxis: b.y2 },
    ]);

    const peMarkLines: Record<string, unknown>[] = [
      {
        yAxis: bands.max,
        label: { formatter: bands.max.toFixed(2), position: "end", fontSize: 11, color: textColor },
        lineStyle: { color: textColor, type: "dashed" as const, width: 1, opacity: 0.5 },
      },
      {
        yAxis: bands.median,
        label: { formatter: bands.median.toFixed(2), position: "start", fontSize: 12, color: primaryColor },
        lineStyle: { color: primaryColor, type: "dashed" as const, width: 2 },
      },
      {
        yAxis: bands.min,
        label: { formatter: bands.min.toFixed(2), position: "end", fontSize: 11, color: textColor },
        lineStyle: { color: textColor, type: "dashed" as const, width: 1, opacity: 0.5 },
      },
    ];

    const yAxes: EChartsOption["yAxis"] = [
      {
        type: "value",
        name: "估值 (PE)",
        nameTextStyle: { color: textColor, fontSize: 12 },
        min: Math.floor(bands.min - 1),
        max: Math.ceil(bands.max + 1),
        axisLabel: { color: textColor, fontSize: 11 },
        axisLine: { lineStyle: { color: textColor } },
        splitLine: { lineStyle: { color: gridColor, opacity: 0.4, type: "dashed" as const } },
      },
    ];

    if (hasClose && closeRange) {
      yAxes.push({
        type: "value",
        name: "收盘点位",
        nameTextStyle: { color: secondaryColor, fontSize: 12 },
        min: Math.floor(closeRange.low * 0.9),
        max: Math.ceil(closeRange.high * 1.05),
        axisLabel: { color: secondaryColor, fontSize: 11 },
        axisLine: { lineStyle: { color: secondaryColor } },
        splitLine: { show: false },
      });
    }

    const series: EChartsOption["series"] = [
      {
        name: "PE",
        type: "line",
        yAxisIndex: 0,
        data: peTimeData,
        symbol: "none",
        lineStyle: { color: brandColor, width: 1.5, opacity: 0.95 },
        itemStyle: { color: brandColor },
        emphasis: {
          lineStyle: { width: 3 },
          itemStyle: { borderColor: "#fff", borderWidth: 2, color: brandColor },
        },
        ...(showBands ? { markArea: { silent: true, data: bandMarkArea as never } } : {}),
        markLine: {
          silent: true,
          symbol: "none",
          data: peMarkLines as never,
        },
        z: 10,
      },
    ];

    if (hasClose) {
      const closeSeries: Record<string, unknown> = {
        name: "收盘点位",
        type: "line",
        yAxisIndex: 1,
        data: closeTimeData,
        symbol: "none",
        lineStyle: { color: secondaryColor, width: 1.5, opacity: 0.9 },
        itemStyle: { color: secondaryColor },
        emphasis: {
          lineStyle: { width: 2.5 },
          itemStyle: { borderColor: "#fff", borderWidth: 1, color: secondaryColor },
        },
        z: 9,
      };

      if (showDropZones && closeRange) {
        closeSeries.markArea = {
          silent: true,
          data: [
            [
              { yAxis: closeRange.drop80, itemStyle: { color: hexToRgba(lossColor, 0.12) } },
              { yAxis: closeRange.drop70 },
            ],
          ],
        };
        closeSeries.markLine = {
          silent: true,
          symbol: "none",
          data: [
            {
              yAxis: closeRange.drop70,
              label: { formatter: `跌 70% (${closeRange.drop70.toFixed(0)})`, position: "end", fontSize: 10, color: warningColor },
              lineStyle: { color: warningColor, type: "dashed", width: 1 },
            },
            {
              yAxis: closeRange.drop80,
              label: { formatter: `跌 80% (${closeRange.drop80.toFixed(0)})`, position: "end", fontSize: 10, color: lossColor },
              lineStyle: { color: lossColor, type: "dashed", width: 1 },
            },
          ],
        };
      }

      series.push(closeSeries as never);
    }

    function getBandLabel(value: number): string {
      const band = bands!.bands.find((b) => value >= b.y1 && value <= b.y2);
      return band?.label ?? "—";
    }

    return {
      grid: {
        top: 40,
        right: hasClose ? 80 : 40,
        bottom: 40,
        left: 60,
        containLabel: false,
      },
      xAxis: {
        type: "time",
        axisLabel: {
          color: textColor,
          fontSize: 11,
          hideOverlap: true,
        },
        axisLine: { lineStyle: { color: gridColor } },
        splitLine: { show: false },
      },
      yAxis: yAxes,
      series,
      tooltip: {
        trigger: "axis",
        backgroundColor: tooltipBg,
        borderColor: gridColor,
        borderWidth: 1,
        padding: [12, 16],
        textStyle: { color: textColor, fontSize: 13 },
        formatter(params: unknown) {
          const arr = params as { data: [string, number]; axisValue: number }[];
          if (!arr?.length) return "";
          const ts = arr[0].axisValue;
          const idx = findClosestIndex(dateIndex, timestamps, ts);
          const point = data[idx];
          if (!point) return "";
          const suggestion = getBandLabel(point.value);
          const d = new Date(point.date);
          const dateLabel = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
          let html = `<div style="font-size:12px;color:${mutedColor};margin-bottom:4px">${dateLabel}</div>`;
          html += `<div style="font-weight:600;color:${textColor}">PE：${point.value.toFixed(2)}</div>`;
          if (typeof point.close === "number") {
            html += `<div style="font-size:13px;color:${mutedColor};margin-top:4px">收盘：${point.close.toFixed(2)}</div>`;
          }
          if (showBands) {
            html += `<div style="margin-top:6px;font-size:13px;font-weight:500;color:${textColor}">操作建议：${suggestion}</div>`;
          }
          return html;
        },
      },
      dataZoom: [
        {
          type: "inside",
          xAxisIndex: 0,
          filterMode: "none",
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          moveOnMouseWheel: false,
        },
      ],
      legend: { show: false },
      animation: !reducedMotion,
      animationDuration: reducedMotion ? 0 : 600,
    };
  }, [data, bands, stats, theme, hasClose, closeRange, showDropZones, showBands, dateIndex, timestamps]);

  if (!data.length || !bands || !stats) return null;

  return (
    <div className="relative w-full">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-4">
        {!hideStatsBar && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg bg-slate-50/80 dark:bg-white/5 py-2.5 px-4 text-sm">
            <span className="flex items-center gap-2">
              <span className="text-[var(--muted-foreground)]">历史估值最高</span>
              <span className="font-semibold tabular-nums text-[var(--foreground)]">
                {stats.high.toFixed(2)}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <span className="text-[var(--muted-foreground)]">十年估值</span>
              <span className="font-semibold tabular-nums text-[color:var(--primary)]">
                {stats.median.toFixed(2)}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <span className="text-[var(--muted-foreground)]">历史估值最低</span>
              <span className="font-semibold tabular-nums text-[var(--foreground)]">
                {stats.low.toFixed(2)}
              </span>
            </span>
            <span className="border-l border-[color:var(--border-color)] pl-4" />
            <span className="flex items-center gap-2">
              <span className="text-[var(--muted-foreground)]">当前 PE</span>
              <span className="font-semibold tabular-nums text-[var(--foreground)]">
                {stats.currentPe.toFixed(2)}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <span className="text-[var(--muted-foreground)]">当前分位点</span>
              <span className="font-semibold tabular-nums text-[var(--foreground)]">
                {stats.percentile}%
              </span>
            </span>
          </div>
        )}
        {chartHeaderRight && (
          <div className="flex flex-wrap items-center gap-4 shrink-0">
            {chartHeaderRight}
          </div>
        )}
      </div>

      <ReactEChartsCore
        echarts={echarts}
        option={option}
        style={{ height: 520, width: "100%" }}
        notMerge
        lazyUpdate
      />

      <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs">
        {showBands && (
          <>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-4 rounded bg-[color:var(--profit)] opacity-30" /> 大买
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-4 rounded bg-[color:var(--profit)] opacity-55" /> 小买
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-4 rounded bg-[color:var(--warning)] opacity-30" /> 不买不卖
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-4 rounded bg-[color:var(--accent)] opacity-30" /> 小卖
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-4 rounded bg-[color:var(--accent)] opacity-60" /> 大卖
            </span>
          </>
        )}
        {hasClose && (
          <>
            {showBands && <span className="border-l border-[color:var(--border-color)] pl-3" />}
            <span className="flex items-center gap-1">
              <span className="inline-block h-0.5 w-4 bg-[color:var(--brand)]" /> PE
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-0.5 w-4 bg-[color:var(--chart-secondary)]" /> 收盘点位
            </span>
          </>
        )}
      </div>
    </div>
  );
}
