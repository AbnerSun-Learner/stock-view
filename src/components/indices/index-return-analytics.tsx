"use client";

import { IndicesReactECharts } from "@/components/indices/indices-react-echarts";
import type { IndexPricePoint } from "@/types/indices";
import * as echarts from "echarts";
import { useMemo } from "react";

interface IndexReturnAnalyticsProps {
  series: readonly IndexPricePoint[];
  indexName: string;
}

interface AnnualReturnRow {
  year: number;
  returnPct: number;
}

interface MonthlyReturnRow {
  year: number;
  months: (number | null)[];
  annual: number | null;
}

interface HoldingReturnCell {
  startYear: number;
  endYear: number;
  years: number;
  cagr: number;
}

interface DrawdownPoint {
  date: string;
  close: number;
  drawdownPct: number;
}

const MONTHS = [
  "1月",
  "2月",
  "3月",
  "4月",
  "5月",
  "6月",
  "7月",
  "8月",
  "9月",
  "10月",
  "11月",
  "12月",
];

const HEATMAP_COLORS = ["#15803d", "#dcfce7", "#fee2e2", "#b91c1c"];

function fmtPct(v: number): string {
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
}

function heatColor(v: number): string {
  if (v <= -15) return HEATMAP_COLORS[0];
  if (v <= -8) return "#16a34a";
  if (v <= -3) return "#86efac";
  if (v < 0) return HEATMAP_COLORS[1];
  if (v < 3) return HEATMAP_COLORS[2];
  if (v < 8) return "#fca5a5";
  if (v < 15) return "#ef4444";
  return HEATMAP_COLORS[3];
}

function groupByYear(series: readonly IndexPricePoint[]) {
  const map = new Map<number, IndexPricePoint[]>();
  for (const point of series) {
    const year = Number(point.date.slice(0, 4));
    const bucket = map.get(year) ?? [];
    bucket.push(point);
    map.set(year, bucket);
  }
  return [...map.entries()].sort(([a], [b]) => a - b);
}

function buildAnnualReturns(series: readonly IndexPricePoint[]) {
  return groupByYear(series)
    .map(([year, points]) => {
      if (points.length < 2) return null;
      const first = points[0].close;
      const last = points[points.length - 1].close;
      return {
        year,
        returnPct: (last / first - 1) * 100,
      };
    })
    .filter((row): row is AnnualReturnRow => row !== null);
}

function buildMonthlyReturns(series: readonly IndexPricePoint[]) {
  const byMonth = new Map<string, IndexPricePoint[]>();
  for (const point of series) {
    const key = point.date.slice(0, 7);
    const bucket = byMonth.get(key) ?? [];
    bucket.push(point);
    byMonth.set(key, bucket);
  }

  const annual = new Map<number, (number | null)[]>();
  for (const [key, points] of byMonth.entries()) {
    if (points.length < 2) continue;
    const year = Number(key.slice(0, 4));
    const month = Number(key.slice(5, 7)) - 1;
    const row =
      annual.get(year) ?? Array.from<number | null>({ length: 12 }).fill(null);
    row[month] = (points[points.length - 1].close / points[0].close - 1) * 100;
    annual.set(year, row);
  }

  const yearly = buildAnnualReturns(series);
  const yearlyMap = new Map(yearly.map((row) => [row.year, row.returnPct]));

  return [...annual.entries()]
    .sort(([a], [b]) => b - a)
    .map(([year, months]) => ({
      year,
      months,
      annual: yearlyMap.get(year) ?? null,
    }));
}

function buildHoldingReturns(series: readonly IndexPricePoint[]) {
  const yearly = groupByYear(series)
    .map(([year, points]) => ({
      year,
      first: points[0]?.close,
      last: points[points.length - 1]?.close,
    }))
    .filter((row) => row.first && row.last);

  const cells: HoldingReturnCell[] = [];
  for (let i = 0; i < yearly.length; i += 1) {
    for (let j = i; j < yearly.length; j += 1) {
      const start = yearly[i];
      const end = yearly[j];
      const years = end.year - start.year + 1;
      const cagr = (Math.pow(end.last / start.first, 1 / years) - 1) * 100;
      cells.push({
        startYear: start.year,
        endYear: end.year,
        years,
        cagr,
      });
    }
  }
  return cells;
}

function buildDrawdownSeries(series: readonly IndexPricePoint[]) {
  let peak = Number.NEGATIVE_INFINITY;
  return series.map((point) => {
    peak = Math.max(peak, point.close);
    return {
      date: point.date,
      close: point.close,
      drawdownPct: (point.close / peak - 1) * 100,
    };
  });
}

function colorClass(v: number | null): string {
  if (v === null) return "bg-transparent text-[var(--muted-foreground)]";
  if (v >= 8)
    return "bg-[color-mix(in_srgb,var(--profit)_72%,white)] text-white";
  if (v >= 3)
    return "bg-[color-mix(in_srgb,var(--profit)_42%,white)] text-[var(--foreground)]";
  if (v > 0)
    return "bg-[color-mix(in_srgb,var(--profit)_16%,white)] text-[var(--foreground)]";
  if (v <= -8)
    return "bg-[color-mix(in_srgb,var(--loss)_70%,white)] text-white";
  if (v <= -3)
    return "bg-[color-mix(in_srgb,var(--loss)_38%,white)] text-[var(--foreground)]";
  return "bg-[color-mix(in_srgb,var(--loss)_14%,white)] text-[var(--foreground)]";
}

export function IndexReturnAnalytics({
  series,
  indexName,
}: IndexReturnAnalyticsProps) {
  const annualReturns = useMemo(() => buildAnnualReturns(series), [series]);
  const holdingReturns = useMemo(() => buildHoldingReturns(series), [series]);
  const monthlyReturns = useMemo(() => buildMonthlyReturns(series), [series]);
  const drawdownSeries = useMemo(() => buildDrawdownSeries(series), [series]);

  const annualOption = useMemo((): echarts.EChartsOption => {
    const years = annualReturns.map((row) => String(row.year));
    const values = annualReturns.map((row) => row.returnPct);
    return {
      grid: { left: 8, right: 8, top: 14, bottom: 32, containLabel: true },
      tooltip: {
        trigger: "axis",
        confine: true,
        borderColor: "var(--border-color)",
        backgroundColor: "var(--correlation-card-surface)",
        textStyle: { color: "var(--foreground)", fontSize: 12 },
        formatter: (raw: unknown) => {
          const item = (Array.isArray(raw) ? raw[0] : raw) as {
            axisValue?: string;
            value?: number;
          };
          if (typeof item.value !== "number") return "";
          return `<div style="font-size:12px;"><div>${
            item.axisValue
          }</div><strong style="font-variant-numeric:tabular-nums;">年度回报：${fmtPct(
            item.value
          )}</strong></div>`;
        },
      },
      xAxis: {
        type: "category",
        data: years,
        axisTick: { show: false },
        axisLine: { lineStyle: { color: "var(--border-color)" } },
        axisLabel: {
          color: "var(--muted-foreground)",
          fontSize: 10,
          interval: Math.max(0, Math.floor(years.length / 8)),
        },
      },
      yAxis: {
        type: "value",
        axisLabel: {
          color: "var(--muted-foreground)",
          formatter: (v: number) => `${v}%`,
        },
        splitLine: {
          lineStyle: { color: "var(--border-color)", opacity: 0.45 },
        },
      },
      series: [
        {
          type: "bar",
          data: values.map((v) => ({
            value: Number(v.toFixed(2)),
            itemStyle: { color: v >= 0 ? "var(--profit)" : "var(--loss)" },
          })),
          barMaxWidth: 10,
          emphasis: { disabled: true },
        },
      ],
    };
  }, [annualReturns]);

  const drawdownOption = useMemo((): echarts.EChartsOption => {
    const dates = drawdownSeries.map((point) => point.date);
    const closeData = drawdownSeries.map((point) =>
      Number(point.close.toFixed(2))
    );
    const drawdownData = drawdownSeries.map((point) =>
      Number(point.drawdownPct.toFixed(2))
    );
    const minDrawdown = Math.min(...drawdownData, 0);
    const axisMin = Math.max(-100, Math.floor((minDrawdown - 5) / 10) * 10);

    return {
      grid: { left: 8, right: 52, top: 18, bottom: 46, containLabel: true },
      tooltip: {
        trigger: "axis",
        confine: true,
        borderColor: "var(--border-color)",
        backgroundColor: "var(--correlation-card-surface)",
        textStyle: { color: "var(--foreground)", fontSize: 12 },
        formatter: (raw: unknown) => {
          const items = Array.isArray(raw) ? raw : [raw];
          const first = items[0] as { axisValue?: string };
          const date = first?.axisValue ?? "";
          const close = items.find(
            (item) => (item as { seriesName?: string }).seriesName === "收盘"
          ) as { value?: number } | undefined;
          const drawdown = items.find(
            (item) => (item as { seriesName?: string }).seriesName === "回撤"
          ) as { value?: number } | undefined;

          return `<div style="font-size:12px;"><div style="color:var(--muted-foreground);margin-bottom:6px;">${date}</div><div style="font-variant-numeric:tabular-nums;">点位：${close?.value?.toLocaleString(
            "zh-CN",
            { maximumFractionDigits: 2 }
          )}</div><div style="font-variant-numeric:tabular-nums;color:#b91c1c;">回撤：${drawdown?.value?.toFixed(
            1
          )}%</div></div>`;
        },
      },
      dataZoom: [
        {
          type: "inside",
          start: 0,
          end: 100,
        },
        {
          type: "slider",
          height: 18,
          bottom: 10,
          borderColor: "transparent",
          fillerColor:
            "color-mix(in srgb, var(--correlation-brand) 18%, transparent)",
          handleStyle: { color: "var(--correlation-brand)" },
          moveHandleStyle: { color: "var(--correlation-brand)" },
          selectedDataBackground: {
            lineStyle: { color: "var(--correlation-brand)" },
            areaStyle: {
              color:
                "color-mix(in srgb, var(--correlation-brand) 12%, transparent)",
            },
          },
          textStyle: { color: "var(--muted-foreground)", fontSize: 10 },
        },
      ],
      xAxis: {
        type: "category",
        data: dates,
        boundaryGap: false,
        axisLine: { lineStyle: { color: "var(--border-color)" } },
        axisTick: { show: false },
        axisLabel: {
          color: "var(--muted-foreground)",
          fontSize: 10,
          formatter: (v: string) => v.slice(0, 4),
        },
      },
      yAxis: [
        {
          type: "value",
          min: axisMin,
          max: 0,
          interval: Math.max(10, Math.ceil(Math.abs(axisMin) / 4 / 10) * 10),
          axisLabel: {
            color: "var(--muted-foreground)",
            formatter: (v: number) => `${v}%`,
          },
          splitLine: {
            lineStyle: { color: "var(--border-color)", opacity: 0.45 },
          },
        },
        {
          type: "log",
          min: 1,
          position: "right",
          axisLabel: {
            color: "var(--muted-foreground)",
            fontSize: 10,
            formatter: (v: number) =>
              v >= 1000 ? `${Math.round(v / 1000)}K` : String(v),
          },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          type: "line",
          name: "回撤",
          yAxisIndex: 0,
          data: drawdownData,
          showSymbol: false,
          smooth: false,
          lineStyle: { width: 0, color: "rgba(220,38,38,0)" },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(220,38,38,0.08)" },
              { offset: 1, color: "rgba(220,38,38,0.45)" },
            ]),
          },
          emphasis: { disabled: true },
        },
        {
          type: "line",
          name: "收盘",
          yAxisIndex: 1,
          data: closeData,
          showSymbol: false,
          smooth: true,
          lineStyle: { width: 1.4, color: "#374151" },
          emphasis: { disabled: true },
        },
      ],
    };
  }, [drawdownSeries]);

  const holdingOption = useMemo((): echarts.EChartsOption => {
    const years = [...new Set(holdingReturns.map((cell) => cell.startYear))];
    const maxYears = Math.max(...holdingReturns.map((cell) => cell.years), 1);
    return {
      grid: { left: 48, right: 16, top: 10, bottom: 36 },
      tooltip: {
        trigger: "item",
        confine: true,
        borderColor: "var(--border-color)",
        backgroundColor: "var(--correlation-card-surface)",
        textStyle: { color: "var(--foreground)", fontSize: 12 },
        formatter: (raw: unknown) => {
          const p = raw as { data?: [number, number, number, number, number] };
          const data = p.data;
          if (!data) return "";
          const start = data[3];
          const end = data[4];
          const yearsHeld = data[0] + 1;
          return `<div style="font-size:12px;"><strong>${start} → ${end}（持有 ${yearsHeld} 年）</strong><br/>年化收益率：<strong>${fmtPct(
            data[2]
          )}</strong></div>`;
        },
      },
      xAxis: {
        type: "category",
        data: Array.from({ length: maxYears }, (_, i) => `${i + 1}年`),
        axisLabel: { color: "var(--muted-foreground)", fontSize: 10 },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      yAxis: {
        type: "category",
        data: years.map(String),
        axisLabel: { color: "var(--muted-foreground)", fontSize: 10 },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      visualMap: {
        dimension: 2,
        min: -20,
        max: 20,
        show: false,
        inRange: {
          color: HEATMAP_COLORS,
        },
      },
      series: [
        {
          type: "heatmap",
          data: holdingReturns.map((cell) => ({
            value: [
              cell.years - 1,
              years.indexOf(cell.startYear),
              Number(cell.cagr.toFixed(2)),
              cell.startYear,
              cell.endYear,
            ],
            itemStyle: { color: heatColor(cell.cagr) },
          })),
          label: {
            show: true,
            fontSize: 9,
            formatter: (p: { value?: unknown }) => {
              const value = Array.isArray(p.value) ? p.value[2] : null;
              return typeof value === "number" ? value.toFixed(1) : "";
            },
          },
          emphasis: { disabled: true },
        },
      ],
    };
  }, [holdingReturns]);

  if (series.length < 2) return null;

  return (
    <section className="space-y-8">
      <ReturnCard
        title={`${indexName} 年度回报`}
        description="按自然年聚合周线收盘价，展示年度收益率分布（MOCK）。"
      >
        <IndicesReactECharts height={340} option={annualOption} />
        <AnnualStats rows={annualReturns} />
      </ReturnCard>

      <ReturnCard
        title={`${indexName} 自高点回撤`}
        description="每个交易日距历史最高点的跌幅；灰线为点位，红色面积表示回撤深度。"
      >
        <IndicesReactECharts height={380} option={drawdownOption} />
        <p className="mt-3 text-[11px] text-[var(--muted-foreground)]">
          回撤 &gt; 10% 的重大事件可在后续接入真实行情与事件标签后补充。
        </p>
      </ReturnCard>

      <ReturnCard
        title={`${indexName} 跨年持有年化收益率`}
        description="每个单元格表示从横向起点买入、持有到对应年份的年化收益率。"
      >
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <IndicesReactECharts height={520} option={holdingOption} />
          </div>
        </div>
      </ReturnCard>

      <ReturnCard
        title="月度涨跌统计"
        description="按月聚合收益率，并统计每个月历史上涨概率（MOCK）。"
      >
        <MonthlyReturnTable rows={monthlyReturns} />
      </ReturnCard>
    </section>
  );
}

interface ReturnCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

function ReturnCard({ title, description, children }: ReturnCardProps) {
  return (
    <section className="rounded-2xl border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] p-5 shadow-[0_14px_36px_color-mix(in_srgb,var(--foreground)_5%,transparent)] md:p-6">
      <h2 className="text-2xl font-medium tracking-tight text-[var(--foreground)]">
        {title}
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-[var(--muted-foreground)]">
        {description}
      </p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function AnnualStats({ rows }: { rows: AnnualReturnRow[] }) {
  const positive = rows.filter((row) => row.returnPct > 0).length;
  const best = rows.reduce(
    (a, b) => (b.returnPct > a.returnPct ? b : a),
    rows[0]
  );
  const worst = rows.reduce(
    (a, b) => (b.returnPct < a.returnPct ? b : a),
    rows[0]
  );
  const avg =
    rows.reduce((sum, row) => sum + row.returnPct, 0) /
    Math.max(rows.length, 1);

  return (
    <div className="mt-4 grid divide-y divide-[var(--border-color)] rounded-xl border border-[color:var(--border-color)] text-sm md:grid-cols-4 md:divide-x md:divide-y-0">
      <Stat label="正收益年份" value={`${positive}/${rows.length}`} />
      <Stat label="长期均值" value={fmtPct(avg)} />
      <Stat
        label="最好一年"
        value={`${best.year} | ${fmtPct(best.returnPct)}`}
      />
      <Stat
        label="最差一年"
        value={`${worst.year} | ${fmtPct(worst.returnPct)}`}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-xs text-[var(--muted-foreground)]">{label}</span>
      <span className="font-mono font-semibold tabular-nums text-[var(--foreground)]">
        {value}
      </span>
    </div>
  );
}

function MonthlyReturnTable({ rows }: { rows: MonthlyReturnRow[] }) {
  const probabilities = MONTHS.map((_, monthIndex) => {
    const values = rows
      .map((row) => row.months[monthIndex])
      .filter((v): v is number => v !== null);
    if (values.length === 0) return null;
    return (values.filter((v) => v > 0).length / values.length) * 100;
  });

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[920px] w-full border-separate border-spacing-0 text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-[1] bg-[var(--correlation-card-surface)] px-3 py-3 text-left font-semibold text-[var(--foreground)]">
              年份
            </th>
            {MONTHS.map((month, i) => (
              <th
                key={month}
                className="px-3 py-3 text-center font-semibold text-[var(--foreground)]"
              >
                <div>{month}</div>
                <div className="mt-1 font-mono text-[10px] text-[var(--profit)]">
                  {probabilities[i] === null
                    ? "—"
                    : `${probabilities[i]!.toFixed(0)}%`}
                </div>
              </th>
            ))}
            <th className="px-3 py-3 text-center font-semibold text-[var(--foreground)]">
              年度
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.year}>
              <th className="sticky left-0 z-[1] border-t border-[var(--border-color)] bg-[var(--correlation-card-surface)] px-3 py-2 text-left font-mono tabular-nums text-[var(--foreground)]">
                {row.year}
              </th>
              {row.months.map((value, i) => (
                <td
                  key={`${row.year}-${i}`}
                  className="border-t border-[var(--border-color)] px-2 py-2 text-center"
                >
                  <span
                    className={`inline-flex min-w-[3rem] justify-center rounded-md px-2 py-1 font-mono tabular-nums ${colorClass(
                      value
                    )}`}
                  >
                    {value === null ? "—" : fmtPct(value)}
                  </span>
                </td>
              ))}
              <td className="border-t border-[var(--border-color)] px-2 py-2 text-center">
                <span
                  className={`inline-flex min-w-[3.5rem] justify-center rounded-md px-2 py-1 font-mono font-semibold tabular-nums ${colorClass(
                    row.annual
                  )}`}
                >
                  {row.annual === null ? "—" : fmtPct(row.annual)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
