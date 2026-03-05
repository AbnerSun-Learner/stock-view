"use client";

import { useMemo } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceArea,
  ReferenceLine,
  CartesianGrid,
} from "recharts";

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
  const b1 = min;
  const b2 = min + rangeBelow * 0.25;
  const b3 = min + rangeBelow * 0.5;
  const b4 = min + rangeBelow * 0.75;
  const t1 = median + rangeAbove * 0.25;
  const t2 = median + rangeAbove * 0.5;
  const t3 = median + rangeAbove * 0.75;

  return {
    min: b1,
    max,
    median,
    bands: [
      { y1: b1, y2: b2, fill: "#dcfce7", label: "大买" },
      { y1: b2, y2: b3, fill: "#bbf7d0", label: "中买" },
      { y1: b3, y2: b4, fill: "#86efac", label: "小买" },
      { y1: b4, y2: median, fill: "#fef9c3", label: "不买不卖" },
      { y1: median, y2: t1, fill: "#fef9c3", label: "不买不卖" },
      { y1: t1, y2: t2, fill: "#fed7aa", label: "小卖" },
      { y1: t2, y2: t3, fill: "#fdba74", label: "中卖" },
      { y1: t3, y2: max, fill: "#f97316", label: "大卖" },
    ],
  };
}

function formatDateLabel(dateStr: string) {
  const [y, m] = dateStr.split("-");
  return m ? `${y}/${m}` : dateStr;
}

export function ValuationChart({
  data,
  theme = "light",
  showDropZones = false,
  hideStatsBar = false,
  chartHeaderRight,
}: ValuationChartProps) {
  const bands = useMemo(() => computeBands(data), [data]);

  const colors = useMemo(
    () => ({
      grid: theme === "dark" ? "#374151" : "#e5e7eb",
      line: "#243B53",
      median: "#0ea5e9",
      text: theme === "dark" ? "#e5e7eb" : "#243B53",
      closeLine: "#9333ea",
    }),
    [theme]
  );

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

  if (!data.length || !bands || !stats) return null;

  const yMin = Math.floor(Math.min(bands.min - 1, ...data.map((d) => d.value)));
  const yMax = Math.ceil(Math.max(bands.max + 1, ...data.map((d) => d.value)));
  const margin = { top: 16, right: hasClose ? 60 : 24, left: 16, bottom: 48 };

  function getBandLabel(value: number): string {
    const band = bands!.bands.find((b) => value >= b.y1 && value <= b.y2);
    return band?.label ?? "—";
  }

  return (
    <div className="relative w-full">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-4">
        {!hideStatsBar && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg bg-slate-50/80 py-2.5 px-4 text-sm">
            <span className="flex items-center gap-2">
              <span className="text-slate-500">历史估值最高</span>
              <span className="font-semibold tabular-nums text-[#243B53]">
                {stats.high.toFixed(2)}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <span className="text-slate-500">十年估值</span>
              <span className="font-semibold tabular-nums text-[#0ea5e9]">
                {stats.median.toFixed(2)}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <span className="text-slate-500">历史估值最低</span>
              <span className="font-semibold tabular-nums text-[#243B53]">
                {stats.low.toFixed(2)}
              </span>
            </span>
            <span className="border-l border-slate-200 pl-4" />
            <span className="flex items-center gap-2">
              <span className="text-slate-500">当前 PE</span>
              <span className="font-semibold tabular-nums text-[#243B53]">
                {stats.currentPe.toFixed(2)}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <span className="text-slate-500">当前分位点</span>
              <span className="font-semibold tabular-nums text-[#243B53]">
                {stats.percentile}%
              </span>
            </span>
          </div>
        )}
        {chartHeaderRight && (
          <div className="flex items-center gap-2 shrink-0">
            {chartHeaderRight}
          </div>
        )}
      </div>

      <div className="relative h-[480px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={margin}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={colors.grid}
              opacity={0.4}
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateLabel}
              stroke={colors.text}
              tick={{ fill: colors.text, fontSize: 11 }}
              label={{
                value: "日期",
                position: "insideBottom",
                offset: -8,
                style: { fill: colors.text, fontSize: 12 },
              }}
            />

            {/* 左 Y 轴：PE 估值 */}
            <YAxis
              yAxisId="left"
              domain={[yMin, yMax]}
              stroke={colors.text}
              tick={{ fill: colors.text, fontSize: 11 }}
              label={{
                value: "估值 (PE)",
                angle: -90,
                position: "insideLeft",
                style: { fill: colors.text, fontSize: 12 },
              }}
            />

            {/* 右 Y 轴：收盘点位 */}
            {hasClose && closeRange && (
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[
                  Math.floor(closeRange.low * 0.9),
                  Math.ceil(closeRange.high * 1.05),
                ]}
                stroke={colors.closeLine}
                tick={{ fill: colors.closeLine, fontSize: 11 }}
                label={{
                  value: "收盘点位",
                  angle: 90,
                  position: "insideRight",
                  style: { fill: colors.closeLine, fontSize: 12 },
                }}
              />
            )}

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const p = payload[0].payload as ValuationPoint;
                const suggestion = getBandLabel(p.value);
                return (
                  <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-lg">
                    <div className="text-xs text-zinc-500 mb-1">
                      {formatDateLabel(p.date)}
                    </div>
                    <div className="font-semibold text-zinc-900">
                      PE：{p.value.toFixed(2)}
                    </div>
                    {typeof p.close === "number" && (
                      <div className="text-sm text-zinc-600 mt-1">
                        收盘：{p.close.toFixed(2)}
                      </div>
                    )}
                    <div className="mt-1.5 text-sm font-medium text-zinc-700">
                      操作建议：{suggestion}
                    </div>
                  </div>
                );
              }}
            />

            {/* 估值带 - 全部绑定 yAxisId="left" */}
            {bands.bands.map((band, i) => (
              <ReferenceArea
                key={i}
                yAxisId="left"
                y1={band.y1}
                y2={band.y2}
                fill={band.fill}
                fillOpacity={0.5}
              />
            ))}

            {/* 70%/80% 下跌区域标注（基于右 Y 轴收盘点位） */}
            {showDropZones && hasClose && closeRange && (
              <>
                <ReferenceArea
                  yAxisId="right"
                  y1={closeRange.drop70}
                  y2={closeRange.drop80}
                  fill="#ef4444"
                  fillOpacity={0.12}
                  label={{
                    value: "下跌 70%~80%",
                    position: "insideTop",
                    fill: "#dc2626",
                    fontSize: 11,
                  }}
                />
                <ReferenceLine
                  yAxisId="right"
                  y={closeRange.drop70}
                  stroke="#dc2626"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  label={{
                    value: `跌 70% (${closeRange.drop70.toFixed(0)})`,
                    position: "right",
                    fill: "#dc2626",
                    fontSize: 10,
                  }}
                />
                <ReferenceLine
                  yAxisId="right"
                  y={closeRange.drop80}
                  stroke="#991b1b"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  label={{
                    value: `跌 80% (${closeRange.drop80.toFixed(0)})`,
                    position: "right",
                    fill: "#991b1b",
                    fontSize: 10,
                  }}
                />
              </>
            )}

            {/* 参考线 - 全部绑定 yAxisId="left" */}
            <ReferenceLine
              yAxisId="left"
              y={bands.max}
              stroke={colors.text}
              strokeWidth={1}
              strokeDasharray="2 2"
              strokeOpacity={0.5}
              label={{
                value: bands.max.toFixed(2),
                position: "right",
                fill: colors.text,
                fontSize: 11,
              }}
            />
            <ReferenceLine
              yAxisId="left"
              y={bands.median}
              stroke={colors.median}
              strokeWidth={2}
              strokeDasharray="6 4"
              label={{
                value: bands.median.toFixed(2),
                position: "left",
                fill: colors.median,
                fontSize: 12,
              }}
            />
            <ReferenceLine
              yAxisId="left"
              y={bands.min}
              stroke={colors.text}
              strokeWidth={1}
              strokeDasharray="2 2"
              strokeOpacity={0.5}
              label={{
                value: bands.min.toFixed(2),
                position: "right",
                fill: colors.text,
                fontSize: 11,
              }}
            />

            {/* PE 折线 → 左 Y 轴 */}
            <Line
              type="monotone"
              dataKey="value"
              yAxisId="left"
              stroke={colors.line}
              strokeWidth={2.5}
              dot={false}
              activeDot={{
                r: 5,
                fill: colors.line,
                stroke: "#fff",
                strokeWidth: 2,
              }}
            />

            {/* 收盘点位折线 → 右 Y 轴 */}
            {hasClose && (
              <Line
                type="monotone"
                dataKey="close"
                yAxisId="right"
                stroke={colors.closeLine}
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: colors.closeLine,
                  stroke: "#fff",
                  strokeWidth: 1,
                }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-4 rounded bg-[#dcfce7]" /> 大买
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-4 rounded bg-[#86efac]" /> 小买
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-4 rounded bg-[#fef9c3]" /> 不买不卖
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-4 rounded bg-[#fed7aa]" /> 小卖
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-4 rounded bg-[#f97316]" /> 大卖
        </span>
        {hasClose && (
          <>
            <span className="border-l border-slate-200 pl-3" />
            <span className="flex items-center gap-1">
              <span className="inline-block h-0.5 w-4 bg-[#243B53]" /> PE
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-0.5 w-4 bg-[#9333ea]" /> 收盘点位
            </span>
          </>
        )}
      </div>
    </div>
  );
}
