"use client";

import type { PairCorrelationData } from "@/lib/correlation/pair-correlation-types";
import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartShell } from "./chart-shell";

interface PairRollingChartProps {
  data: PairCorrelationData;
}

interface ChartRow {
  date: string;
  monthLabel: string;
  value: number;
}

interface RollingTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: ChartRow }>;
}

function RollingTooltip({ active, payload }: RollingTooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="font-en-arial rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs shadow-[var(--ds-shadow-sm)]">
      <p className="mb-1 text-[var(--muted-foreground)]">{row.date}</p>
      <p className="font-en-arial tabular-nums text-[var(--foreground)]">
        滚动相关系数 {row.value.toFixed(2)}
      </p>
    </div>
  );
}

export function PairRollingChart({ data }: PairRollingChartProps) {
  const chartData: ChartRow[] = useMemo(
    () =>
      data.rolling.map((p) => {
        const [, mm, dd] = p.date.split("-");
        return {
          date: p.date,
          monthLabel: `${Number(mm)}/${Number(dd)}`,
          value: Number(p.value.toFixed(3)),
        };
      }),
    [data.rolling]
  );

  const axisColor = "var(--muted-foreground)";
  const gridColor = "var(--border-color)";
  const lineColor = "var(--correlation-chart-line)";
  const fillColor = "var(--correlation-chart-line)";

  // 仅在数据中均匀挑选 5 个 tick 显示，避免横轴拥挤
  const tickValues = useMemo(() => {
    if (chartData.length <= 5) return chartData.map((d) => d.monthLabel);
    const step = Math.floor(chartData.length / 5);
    const ticks: string[] = [];
    for (let i = 0; i < chartData.length; i += step) {
      ticks.push(chartData[i].monthLabel);
    }
    return ticks;
  }, [chartData]);

  return (
    <div className="correlation-card p-6 md:p-8 flex flex-col">
      <div className="mb-1">
        <p className="ds-card-eyebrow">Rolling Linkage</p>
        <h3 className="mt-2 text-lg font-semibold leading-snug tracking-tight text-[var(--foreground)]">
          历史联动趋势
        </h3>
        <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
          {data.a.code} 与 {data.b.code} 的 60 日滚动皮尔逊相关系数
        </p>
      </div>

      <div className="mt-4">
        <ChartShell height={320}>
          <ResponsiveContainer width="100%" height="100%" debounce={50}>
            <ComposedChart
              data={chartData}
              margin={{ top: 8, right: 16, bottom: 12, left: 4 }}
            >
              <defs>
                <linearGradient
                  id="rollingFillCorrelation"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={fillColor} stopOpacity={0.22} />
                  <stop
                    offset="100%"
                    stopColor={fillColor}
                    stopOpacity={0.03}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke={gridColor}
                strokeDasharray="3 3"
                opacity={0.5}
                vertical={false}
              />
              <XAxis
                dataKey="monthLabel"
                stroke={axisColor}
                tick={{ fill: axisColor, fontSize: 11 }}
                ticks={tickValues}
                interval="preserveStartEnd"
                tickLine={false}
              />
              <YAxis
                domain={[-1, 1]}
                ticks={[-1, -0.5, 0, 0.5, 1]}
                stroke={axisColor}
                tick={{ fill: axisColor, fontSize: 11 }}
                tickLine={false}
                tickFormatter={(v) => Number(v).toFixed(1)}
                width={40}
              />
              <Tooltip
                cursor={{ stroke: gridColor, strokeWidth: 1 }}
                content={(props) => <RollingTooltip {...props} />}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="none"
                fill="url(#rollingFillCorrelation)"
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={lineColor}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartShell>
      </div>
    </div>
  );
}
