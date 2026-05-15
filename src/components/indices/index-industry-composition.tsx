"use client";

import { IndicesReactECharts } from "@/components/indices/indices-react-echarts";
import type {
  IndustryCompositionByLevel,
  IndustryWeightRow,
} from "@/types/indices";
import { Segmented } from "antd";
import * as echarts from "echarts";
import type { CallbackDataParams } from "echarts/types/dist/shared";
import { useMemo, useState } from "react";

type SwLevel = "sw1" | "sw2" | "sw3";

const SW_LABELS: Record<SwLevel, string> = {
  sw1: "申万一级",
  sw2: "申万二级",
  sw3: "申万三级",
};

const PIE_PALETTE = [
  "#2f6fec",
  "#0f8a7f",
  "#7c3aed",
  "#f97316",
  "#dc2626",
  "#475569",
  "#65a30d",
  "#a16207",
  "#0891b2",
  "#db2777",
];

const MAX_VISIBLE_INDUSTRY_ROWS = 9;
const OTHER_INDUSTRY_NAME = "其他";

interface IndexIndustryCompositionProps {
  data: IndustryCompositionByLevel;
}

export function IndexIndustryComposition({
  data,
}: IndexIndustryCompositionProps) {
  const [level, setLevel] = useState<SwLevel>("sw1");

  const sourceRows: IndustryWeightRow[] = useMemo(() => {
    return data[level] ?? [];
  }, [data, level]);

  const rows: IndustryWeightRow[] = useMemo(() => {
    const visible = sourceRows.slice(0, MAX_VISIBLE_INDUSTRY_ROWS);
    const hiddenWeight = sourceRows
      .slice(MAX_VISIBLE_INDUSTRY_ROWS)
      .reduce((sum, row) => sum + row.weightPct, 0);
    if (hiddenWeight <= 0) return visible;
    return [
      ...visible,
      {
        name: OTHER_INDUSTRY_NAME,
        weightPct: Math.round(hiddenWeight * 10) / 10,
      },
    ];
  }, [sourceRows]);

  const topRows = useMemo(() => rows.slice(0, 3), [rows]);
  const restWeight = useMemo(() => {
    return sourceRows.slice(3).reduce((sum, row) => sum + row.weightPct, 0);
  }, [sourceRows]);
  const asOfLabel = data.asOfDate ?? "最新可用交易日";

  const pieOption = useMemo((): echarts.EChartsOption | null => {
    if (rows.length === 0) return null;
    const chartData = rows.map((r, i) => ({
      name: r.name,
      value: r.weightPct,
      itemStyle: {
        color: PIE_PALETTE[i % PIE_PALETTE.length],
        borderColor: "var(--correlation-card-surface)",
        borderWidth: 2,
      },
    }));

    return {
      tooltip: {
        trigger: "item",
        confine: true,
        borderColor: "var(--border-color)",
        backgroundColor: "var(--correlation-card-surface)",
        textStyle: { color: "var(--foreground)", fontSize: 12 },
        formatter: (raw: unknown) => {
          const p = raw as { name?: string; value?: number };
          const name = p.name ?? "";
          const v = p.value;
          if (typeof v !== "number") return "";
          return `<div style="font-size:12px;"><div style="font-weight:600;">${name}</div><div style="margin-top:6px;font-variant-numeric:tabular-nums;color:var(--muted-foreground);">权重 ${v.toFixed(
            1
          )}%</div></div>`;
        },
      },
      series: [
        {
          type: "pie",
          radius: ["42%", "68%"],
          center: ["50%", "52%"],
          padAngle: 2,
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 2 },
          label: {
            show: true,
            color: "var(--muted-foreground)",
            fontSize: 11,
            formatter: (p: CallbackDataParams) => {
              if (typeof p.value !== "number") return p.name ?? "";
              return `${p.name ?? ""}\n${p.value.toFixed(1)}%`;
            },
          },
          labelLine: {
            length: 10,
            length2: 8,
            lineStyle: { color: "var(--muted-foreground)", opacity: 0.45 },
          },
          emphasis: { disabled: true },
          data: chartData,
        },
      ],
    } satisfies echarts.EChartsOption;
  }, [rows]);

  return (
    <section className="rounded-2xl border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] p-5 shadow-[0_14px_36px_color-mix(in_srgb,var(--foreground)_5%,transparent)] md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[var(--correlation-brand)]">
            Exposure
          </p>
          <h2 className="mt-2 text-2xl font-medium tracking-tight text-[var(--foreground)]">
            行业暴露
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            按 {SW_LABELS[level]} 口径拆分当前指数行业权重结构，权重截至{" "}
            <span className="font-mono tabular-nums">{asOfLabel}</span>。
          </p>
        </div>
        <Segmented<SwLevel>
          options={[
            { label: "申万一级", value: "sw1" },
            { label: "申万二级", value: "sw2" },
            { label: "申万三级", value: "sw3" },
          ]}
          value={level}
          onChange={setLevel}
          className="self-start md:self-auto"
        />
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-[var(--muted-foreground)]">
          TuShare 暂无可用行业拆解数据。
        </p>
      ) : (
        <div className="mt-6 grid items-stretch gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="min-w-0 h-full">
            <div className="grid h-full gap-5">
              <div className="min-h-[360px] min-w-0">
                {pieOption ? (
                  <div className="relative">
                    <IndicesReactECharts height={360} option={pieOption} />
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <p className="text-center text-base font-bold leading-snug text-[var(--foreground)]">
                        {SW_LABELS[level]}
                        <br />
                        行业暴露
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 xl:grid-cols-4">
                {rows.map((row, i) => (
                  <div
                    key={`${level}-legend-${row.name}`}
                    className="flex min-h-10 items-center justify-between gap-2 rounded-lg border border-[color:var(--border-color)] bg-[var(--correlation-card-tint)] px-2.5 py-2"
                  >
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{
                          backgroundColor: PIE_PALETTE[i % PIE_PALETTE.length],
                        }}
                      />
                      <span className="truncate text-[var(--foreground)]">
                        {row.name}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono tabular-nums text-[var(--muted-foreground)]">
                      {row.weightPct.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="rounded-2xl border border-[color:var(--border-color)] bg-[var(--correlation-card-tint)] p-5 shadow-[0_12px_30px_color-mix(in_srgb,var(--foreground)_4%,transparent)]">
            <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[var(--correlation-brand)]">
              结构观察
            </p>
            <h3 className="mt-3 text-base font-semibold text-[var(--foreground)]">
              当前结构最集中的三大行业
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-[var(--muted-foreground)]">
              数据基于当前可用行业权重拆解，权重截至{" "}
              <span className="font-mono tabular-nums">{asOfLabel}</span>。
            </p>

            <div className="mt-5 space-y-4">
              {topRows.map((row, i) => (
                <div key={`${level}-top-${row.name}`} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor: PIE_PALETTE[i % PIE_PALETTE.length],
                        }}
                      />
                      <span className="truncate">{row.name}</span>
                    </span>
                    <span className="font-mono text-sm font-semibold tabular-nums text-[var(--foreground)]">
                      {row.weightPct.toFixed(2)}%
                    </span>
                  </div>
                  <p className="pl-4 text-[11px] leading-relaxed text-[var(--muted-foreground)]">
                    权重靠前，代表该指数在该行业的主要暴露来源。
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] px-4 py-3">
              <p className="text-[11px] text-[var(--muted-foreground)]">
                其余行业合计
              </p>
              <p className="mt-1 font-mono text-lg tabular-nums text-[var(--foreground)]">
                {restWeight.toFixed(1)}%
              </p>
            </div>

            <p className="mt-5 text-[11px] leading-relaxed text-[var(--muted-foreground)]">
              来源：指数行业权重数据。
            </p>
          </aside>
        </div>
      )}
    </section>
  );
}
