"use client";

import { ChartShell } from "@/components/correlation/chart-shell";
import type { IndexValuationPoint } from "@/types/indices";
import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ValTooltipProps {
  active?: boolean;
  payload?: readonly {
    dataKey?: string | number;
    value?: unknown;
    name?: unknown;
  }[];
  label?: string | number;
}

function ValTooltip({ active, payload, label }: ValTooltipProps) {
  if (!active || !payload?.length) return null;

  const pePayload = payload.find((p) => p.dataKey === "peTtm");
  const pbPayload = payload.find((p) => p.dataKey === "pb");

  return (
    <div className="indices-chart-tooltip rounded-lg px-3 py-2 text-xs border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] shadow-md space-y-1">
      <p className="text-[var(--muted-foreground)] font-mono">{label}</p>
      {pePayload?.value != null ? (
        <p className="font-mono tabular-nums text-[var(--foreground)]">
          PE（TTM） {(pePayload.value as number).toFixed(2)}
        </p>
      ) : null}
      {pbPayload?.value != null ? (
        <p className="font-mono tabular-nums text-[var(--foreground)]">
          PB {(pbPayload.value as number).toFixed(3)}
        </p>
      ) : null}
    </div>
  );
}

interface IndexValuationChartProps {
  series: readonly IndexValuationPoint[];
  windowLabel: string;
}

export function IndexValuationChart({
  series,
  windowLabel,
}: IndexValuationChartProps) {
  const axisColor = "var(--muted-foreground)";
  const gridColor = "var(--border-color)";
  const hasPe = useMemo(() => series.some((p) => p.peTtm !== null), [series]);
  const hasPb = useMemo(() => series.some((p) => p.pb !== null), [series]);

  const ticks = useMemo(() => {
    if (series.length <= 6) return series.map((p) => p.date);
    const step = Math.max(1, Math.floor(series.length / 5));
    const out: string[] = [];
    for (let i = 0; i < series.length; i += step) out.push(series[i].date);
    const last = series[series.length - 1].date;
    if (out[out.length - 1] !== last) out.push(last);
    return out;
  }, [series]);

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
    <div className="rounded-xl border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] p-4 md:p-5">
      <p className="text-xs text-[var(--muted-foreground)] mb-3 tracking-wide">
        估值走势 · {windowLabel}（PE / PB 周线 MOCK）
      </p>
      <ChartShell height={300}>
        <ResponsiveContainer width="100%" height="100%" debounce={50}>
          <LineChart
            data={series as IndexValuationPoint[]}
            margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
          >
            <CartesianGrid
              strokeDasharray="3 6"
              stroke={gridColor}
              opacity={0.55}
            />
            <XAxis
              dataKey="date"
              ticks={ticks}
              stroke={axisColor}
              tick={{ fill: axisColor, fontSize: 10 }}
              tickMargin={8}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={48}
            />
            {hasPe ? (
              <YAxis
                yAxisId="pe"
                stroke={axisColor}
                orientation="left"
                width={52}
                tick={{ fill: axisColor, fontSize: 10 }}
                tickFormatter={(v) =>
                  typeof v === "number" ? v.toFixed(1) : String(v)
                }
              />
            ) : null}
            {hasPb ? (
              <YAxis
                yAxisId="pb"
                stroke={axisColor}
                orientation="right"
                width={48}
                tick={{ fill: axisColor, fontSize: 10 }}
                tickFormatter={(v) =>
                  typeof v === "number" ? v.toFixed(2) : String(v)
                }
              />
            ) : null}
            <Tooltip content={<ValTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              formatter={(value) => (
                <span className="text-[var(--foreground)]">{value}</span>
              )}
            />
            {hasPe ? (
              <Line
                yAxisId="pe"
                type="monotone"
                dataKey="peTtm"
                name="PE（TTM）"
                stroke="var(--correlation-brand)"
                strokeWidth={1.6}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            ) : null}
            {hasPb ? (
              <Line
                yAxisId="pb"
                type="monotone"
                dataKey="pb"
                name="PB"
                stroke="color-mix(in srgb, var(--correlation-brand) 55%, #0d9488)"
                strokeWidth={1.6}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </ChartShell>
    </div>
  );
}
