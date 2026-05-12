"use client";

import { ChartShell } from "@/components/correlation/chart-shell";
import type { IndexPricePoint } from "@/types/indices";
import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface DrawdownLevels {
  peak: number;
  /** 最高价回撤 70% 对应价位（最高价 × 30%） */
  priceAt70Dd: number;
  /** 最高价回撤 80% 对应价位（最高价 × 20%） */
  priceAt80Dd: number;
}

function computeDrawdownLevels(
  series: readonly IndexPricePoint[]
): DrawdownLevels {
  const peak = Math.max(...series.map((p) => p.close));
  return {
    peak,
    priceAt70Dd: peak * (1 - 0.7),
    priceAt80Dd: peak * (1 - 0.8),
  };
}

interface PriceTooltipBodyProps {
  active?: boolean;
  payload?: readonly { value?: number }[];
  label?: string;
  drawdownLines:
    | (DrawdownLevels & { showDd70: boolean; showDd80: boolean })
    | null;
}

function PriceTooltipBody({
  active,
  payload,
  label,
  drawdownLines,
}: PriceTooltipBodyProps) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  if (v === undefined) return null;

  const fmtPrice = (n: number) =>
    n.toLocaleString("zh-CN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="indices-chart-tooltip rounded-lg px-3 py-2 text-xs border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] shadow-md space-y-1.5">
      <p className="text-[var(--muted-foreground)] font-mono mb-0">{label}</p>
      <p className="text-[var(--foreground)] font-mono tabular-nums">
        收盘 {fmtPrice(v)}
      </p>
      {drawdownLines?.showDd70 || drawdownLines?.showDd80 ? (
        <div className="pt-2 mt-2 border-t border-[color:var(--border-color)] text-[var(--muted-foreground)] space-y-1">
          <p className="text-[11px] text-[var(--foreground)] mb-1">
            回撤参考水位
          </p>
          {drawdownLines.showDd70 ? (
            <p className="font-mono tabular-nums leading-snug">
              最高价回撤{" "}
              <span className="text-[var(--correlation-chart-series-2,#c2410c)]">
                70%
              </span>
              ：{fmtPrice(drawdownLines.priceAt70Dd)}{" "}
              <span className="opacity-75">（约为区间最高价的 30%）</span>
            </p>
          ) : null}
          {drawdownLines.showDd80 ? (
            <p className="font-mono tabular-nums leading-snug">
              最高价回撤{" "}
              <span className="text-[var(--correlation-chart-series-4,#92400e)]">
                80%
              </span>
              ：{fmtPrice(drawdownLines.priceAt80Dd)}{" "}
              <span className="opacity-75">（约为区间最高价的 20%）</span>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

interface IndexPriceChartProps {
  series: readonly IndexPricePoint[];
  windowLabel: string;
  /** 区间为可视序列内最高价回撤 70% 对应价位标注 */
  showDrawdown70: boolean;
  showDrawdown80: boolean;
}

export function IndexPriceChart({
  series,
  windowLabel,
  showDrawdown70,
  showDrawdown80,
}: IndexPriceChartProps) {
  const axisColor = "var(--muted-foreground)";
  const gridColor = "var(--border-color)";
  const lineColor = "var(--valuation-chart-close-line)";

  const drawdownLevels = useMemo(
    () => (series.length > 0 ? computeDrawdownLevels(series) : null),
    [series]
  );

  const ticks = useMemo(() => {
    if (series.length <= 6) return series.map((p) => p.date);
    const step = Math.max(1, Math.floor(series.length / 5));
    const out: string[] = [];
    for (let i = 0; i < series.length; i += step) out.push(series[i].date);
    const last = series[series.length - 1].date;
    if (out[out.length - 1] !== last) out.push(last);
    return out;
  }, [series]);

  const tooltipDrawdown =
    drawdownLevels && (showDrawdown70 || showDrawdown80)
      ? {
          ...drawdownLevels,
          showDd70: showDrawdown70,
          showDd80: showDrawdown80,
        }
      : null;

  if (series.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-[color:var(--border-color)] bg-[var(--correlation-card-tint)] text-sm text-[var(--muted-foreground)]"
        style={{ height: 320 }}
      >
        暂无收盘价序列（MOCK）
      </div>
    );
  }

  const ddPeakLabel =
    drawdownLevels !== null
      ? `区间内最高收盘价 ${drawdownLevels.peak.toLocaleString("zh-CN", {
          maximumFractionDigits: 2,
        })}`
      : "";

  return (
    <div className="rounded-xl border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <p className="text-xs text-[var(--muted-foreground)] tracking-wide max-w-xl">
          价格指数收盘 · {windowLabel}（周线 MOCK，复权口径与数据源对齐后替换）
        </p>
        {(showDrawdown70 || showDrawdown80) && drawdownLevels ? (
          <p className="text-[10px] text-[var(--muted-foreground)] font-mono tabular-nums text-right leading-relaxed">
            {ddPeakLabel}
          </p>
        ) : null}
      </div>
      <ChartShell height={320}>
        <ResponsiveContainer width="100%" height="100%" debounce={50}>
          <LineChart
            data={series as IndexPricePoint[]}
            margin={{ top: 8, right: 12, bottom: 4, left: 4 }}
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
              angle={-22}
              textAnchor="end"
              height={52}
            />
            <YAxis
              stroke={axisColor}
              tick={{ fill: axisColor, fontSize: 10 }}
              domain={["auto", "auto"]}
              width={56}
              tickFormatter={(v) =>
                typeof v === "number"
                  ? v.toLocaleString("zh-CN", { maximumFractionDigits: 0 })
                  : String(v)
              }
            />
            <Tooltip
              cursor={{ stroke: gridColor }}
              content={(tp) => (
                <PriceTooltipBody
                  active={tp.active}
                  payload={
                    tp.payload as readonly { value?: number }[] | undefined
                  }
                  label={tp.label as string | undefined}
                  drawdownLines={tooltipDrawdown}
                />
              )}
            />
            {showDrawdown70 && drawdownLevels ? (
              <ReferenceLine
                y={drawdownLevels.priceAt70Dd}
                stroke="color-mix(in srgb, #ea580c 88%, transparent)"
                strokeDasharray="5 4"
                ifOverflow="extendDomain"
              />
            ) : null}
            {showDrawdown80 && drawdownLevels ? (
              <ReferenceLine
                y={drawdownLevels.priceAt80Dd}
                stroke="color-mix(in srgb, #a16207 88%, transparent)"
                strokeDasharray="4 4"
                ifOverflow="extendDomain"
              />
            ) : null}
            <Line
              type="monotone"
              dataKey="close"
              name="收盘"
              stroke={lineColor}
              strokeWidth={1.8}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartShell>
      {(showDrawdown70 || showDrawdown80) && drawdownLevels ? (
        <ul className="mt-3 space-y-1 text-[10px] text-[var(--muted-foreground)]">
          <li>
            「70%」「80%」为开关：打开后在图中标注自
            <strong>区间内最高价向下回撤</strong>
            相应比例对应的价格水位；tooltip 中会同步复述参考值。
          </li>
          {showDrawdown70 ? (
            <li className="font-mono tabular-nums">
              回撤 70% 参考线：
              <span className="text-[var(--foreground)]">
                {drawdownLevels.priceAt70Dd.toLocaleString("zh-CN", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </li>
          ) : null}
          {showDrawdown80 ? (
            <li className="font-mono tabular-nums">
              回撤 80% 参考线：
              <span className="text-[var(--foreground)]">
                {drawdownLevels.priceAt80Dd.toLocaleString("zh-CN", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </li>
          ) : null}
        </ul>
      ) : (
        <p className="mt-3 text-[10px] leading-relaxed text-[var(--muted-foreground)]">
          脚注：M1 仅展示单一收盘曲线；复权方式（前复权 /
          全收益）以接入行情源时的说明为准。
        </p>
      )}
    </div>
  );
}
