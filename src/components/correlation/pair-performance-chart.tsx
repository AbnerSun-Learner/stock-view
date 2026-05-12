"use client";

import type {
  PairCorrelationData,
  PerformancePoint,
} from "@/lib/correlation/pair-correlation-types";
import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartShell } from "./chart-shell";

interface PairPerformanceChartProps {
  data: PairCorrelationData;
  periodLabel: string;
}

function fmtSignedPct(v: number): string {
  const s = v >= 0 ? "+" : "";
  return `${s}${v.toFixed(2)}%`;
}

interface PerfTooltipProps {
  active?: boolean;
  payload?: readonly { payload?: PerformancePoint }[];
  label?: string;
  nameA: string;
  codeA: string;
  nameB: string;
  codeB: string;
}

function PerformanceTooltip({
  active,
  payload,
  label,
  nameA,
  codeA,
  nameB,
  codeB,
}: PerfTooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  if (!row) return null;
  return (
    <div className="correlation-rich-tooltip">
      <p className="mb-2 font-en-arial tabular-nums text-[11px] text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="leading-snug text-[var(--foreground)]">
        <span>{nameA}</span>
        <span className="font-en-arial text-[var(--muted-foreground)] tabular-nums">
          （{codeA}）
        </span>
      </p>
      <p className="mt-1 pl-0.5 font-en-arial tabular-nums text-[11px]">
        估算涨跌幅（当日） {fmtSignedPct(row.dayChangePctA)}
      </p>
      <p className="mt-2.5 leading-snug text-[var(--foreground)]">
        <span>{nameB}</span>
        <span className="font-en-arial text-[var(--muted-foreground)] tabular-nums">
          （{codeB}）
        </span>
      </p>
      <p className="mt-1 pl-0.5 font-en-arial tabular-nums text-[11px]">
        估算涨跌幅（当日） {fmtSignedPct(row.dayChangePctB)}
      </p>
      <p className="mt-3 border-t border-[color:var(--border-color)] pt-2.5 text-[10px] leading-relaxed text-[var(--muted-foreground)]">
        由相邻两日共同交易日的复权收盘价推算日收益，可能与行情展示口径略有差异。
      </p>
    </div>
  );
}

export function PairPerformanceChart({
  data,
  periodLabel,
}: PairPerformanceChartProps) {
  const series = data.performanceSeries;
  const axisColor = "var(--muted-foreground)";
  const gridColor = "var(--border-color)";
  const colorA = "var(--correlation-chart-line)";
  const colorB = "var(--correlation-chart-scatter)";

  const tickDates = useMemo(() => {
    if (series.length <= 6) return series.map((p) => p.date);
    const step = Math.max(1, Math.floor(series.length / 5));
    const ticks: string[] = [];
    for (let i = 0; i < series.length; i += step) ticks.push(series[i].date);
    const last = series[series.length - 1].date;
    if (ticks[ticks.length - 1] !== last) ticks.push(last);
    return ticks;
  }, [series]);

  const legendNameA = `${data.a.name}（${data.a.code}）`;
  const legendNameB = `${data.b.name}（${data.b.code}）`;

  return (
    <div className="correlation-card p-6 md:p-8 flex flex-col">
      <div className="mb-1">
        <p className="ds-card-eyebrow">Performance Trend</p>
        <h3 className="mt-2 text-lg font-semibold leading-snug tracking-tight text-[var(--foreground)]">
          业绩走势（{data.a.name} vs {data.b.name}）
        </h3>
        <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
          <span className="font-en-arial tracking-tight tabular-nums">
            {data.a.code} · {data.b.code}
          </span>
          {" · "}
          {periodLabel}
          ：纵轴为各交易日<strong>估算涨跌幅</strong>
          （%），便于对照两只指数基金的涨跌节奏。
          {" · "}
          {data.rangeLabel}
        </p>
      </div>

      <div className="mt-4">
        <ChartShell height={320}>
          <ResponsiveContainer width="100%" height="100%" debounce={50}>
            <LineChart
              data={series}
              margin={{ top: 8, right: 16, bottom: 12, left: 4 }}
            >
              <CartesianGrid
                stroke={gridColor}
                strokeDasharray="3 3"
                opacity={0.5}
                vertical={false}
              />
              <XAxis
                dataKey="date"
                ticks={tickDates}
                stroke={axisColor}
                tick={{ fill: axisColor, fontSize: 11 }}
                tickLine={false}
                minTickGap={24}
                tickFormatter={(v) => {
                  const s = String(v);
                  const tail = s.slice(5);
                  return tail.startsWith("0") ? tail.slice(1) : tail;
                }}
              />
              <YAxis
                stroke={axisColor}
                tick={{ fill: axisColor, fontSize: 11 }}
                tickLine={false}
                tickFormatter={(v) => `${Number(v).toFixed(1)}%`}
                width={48}
                domain={["auto", "auto"]}
              />
              <ReferenceLine y={0} stroke={gridColor} strokeDasharray="2 2" />
              <Tooltip
                cursor={{ stroke: gridColor, strokeWidth: 1 }}
                content={(props) => (
                  <PerformanceTooltip
                    active={props.active}
                    payload={props.payload as PerfTooltipProps["payload"]}
                    label={
                      props.label != null ? String(props.label) : undefined
                    }
                    nameA={data.a.name}
                    codeA={data.a.code}
                    nameB={data.b.name}
                    codeB={data.b.code}
                  />
                )}
              />
              <Legend
                verticalAlign="top"
                align="left"
                wrapperStyle={{
                  paddingBottom: 12,
                  fontSize: 12,
                  color: "var(--foreground)",
                }}
                formatter={(value) => (
                  <span className="text-[11px] text-[var(--foreground)]">
                    {value}
                  </span>
                )}
              />
              <Line
                type="monotone"
                dataKey="dayChangePctA"
                name={legendNameA}
                stroke={colorA}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="dayChangePctB"
                name={legendNameB}
                stroke={colorB}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartShell>
      </div>
    </div>
  );
}
