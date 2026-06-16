"use client";

import { sortTrackingEtfs } from "@/lib/indices/sort-etfs";
import type { TrackingEtfRow } from "@/types/indices";
import { Button, Tag } from "antd";
import { useMemo } from "react";

interface IndexEtfTableProps {
  etfs: readonly TrackingEtfRow[];
}

function fmtYi(v: number | null): string {
  if (v === null) return "—";
  return `${v.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}`;
}

function fmtPctRatio(v: number | null): string {
  if (v === null) return "—";
  return `${(v * 100).toFixed(2)}%`;
}

function fmtPctPoints(v: number | null): string {
  if (v === null) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

function sumNullable(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length === 0) return null;
  return valid.reduce((sum, v) => sum + v, 0);
}

function avgNullable(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length === 0) return null;
  return valid.reduce((sum, v) => sum + v, 0) / valid.length;
}

export function IndexEtfTable({ etfs }: IndexEtfTableProps) {
  const sorted = useMemo(() => sortTrackingEtfs(etfs), [etfs]);

  const totalAum = useMemo(
    () => sumNullable(sorted.map((row) => row.aumYi)),
    [sorted]
  );
  const totalTurnover = useMemo(
    () => sumNullable(sorted.map((row) => row.avgDailyTurnoverYi)),
    [sorted]
  );
  const avgExpense = useMemo(
    () => avgNullable(sorted.map((row) => row.expenseRatio)),
    [sorted]
  );
  const bestLiquidity = sorted[0] ?? null;

  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl border border-[color:var(--border-color)] bg-[var(--correlation-card-tint)] px-6 py-10 text-center text-sm text-[var(--muted-foreground)]">
        当前指数暂未匹配到可展示 ETF
      </div>
    );
  }

  const hasRelatedRows = sorted.some((row) => row.matchType === "related");

  return (
    <section className="rounded-2xl border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] p-5 shadow-[0_14px_36px_color-mix(in_srgb,var(--foreground)_5%,transparent)] md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[var(--correlation-brand)]">
            ETF Tracker
          </p>
          <h3 className="mt-2 text-2xl font-medium tracking-tight text-[var(--foreground)]">
            跟踪 ETF
          </h3>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            按规模与流动性排序，优先展示严格跟踪当前指数的 ETF。
            {hasRelatedRows ? "暂无精确样本时展示同方向相关标的。" : null}
          </p>
        </div>
        <div className="rounded-xl border border-[color:var(--border-color)] bg-[var(--correlation-card-tint)] px-4 py-3 text-xs text-[var(--muted-foreground)]">
          样本数量
          <span className="mt-1 block font-mono text-lg tabular-nums text-[var(--foreground)]">
            {sorted.length}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[color:var(--border-color)] bg-[var(--correlation-card-tint)] p-4">
          <p className="text-[11px] text-[var(--muted-foreground)]">
            合计规模（亿元）
          </p>
          <p className="mt-1 font-mono text-2xl tabular-nums text-[var(--foreground)]">
            {fmtYi(totalAum)}
          </p>
        </div>
        <div className="rounded-xl border border-[color:var(--border-color)] bg-[var(--correlation-card-tint)] p-4">
          <p className="text-[11px] text-[var(--muted-foreground)]">
            日均成交额（亿元）
          </p>
          <p className="mt-1 font-mono text-2xl tabular-nums text-[var(--foreground)]">
            {fmtYi(totalTurnover)}
          </p>
        </div>
        <div className="rounded-xl border border-[color:var(--border-color)] bg-[var(--correlation-card-tint)] p-4">
          <p className="text-[11px] text-[var(--muted-foreground)]">
            平均管理费率
          </p>
          <p className="mt-1 font-mono text-2xl tabular-nums text-[var(--foreground)]">
            {fmtPctRatio(avgExpense)}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-3">
          {sorted.map((row, index) => (
            <article
              key={row.code}
              className="rounded-xl border border-[color:var(--border-color)] bg-[var(--correlation-card-tint)] p-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[var(--correlation-brand)] px-2.5 py-1 text-[11px] font-semibold text-white">
                      TOP {index + 1}
                    </span>
                    <EtfMatchTag matchType={row.matchType} />
                    <span className="font-mono text-sm tabular-nums text-[var(--correlation-brand)]">
                      {row.code}
                    </span>
                  </div>
                  <h4 className="mt-2 truncate text-base font-semibold text-[var(--foreground)]">
                    {row.name}
                  </h4>
                </div>
                <Button
                  type="primary"
                  href={`/etfs/${encodeURIComponent(row.code)}`}
                  className="self-start"
                >
                  ETF 详情
                </Button>
              </div>

              {row.matchType === "related" ? (
                <p className="mt-3 rounded-lg border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] px-3 py-2 text-xs leading-relaxed text-[var(--muted-foreground)]">
                  该产品跟踪 {row.trackingIndexName ?? "相近指数"}
                  ，仅作为同方向观察标的。
                </p>
              ) : null}

              <div className="mt-4 grid gap-3 text-xs sm:grid-cols-5">
                <Metric label="规模" value={`${fmtYi(row.aumYi)} 亿`} />
                <Metric label="管理费" value={fmtPctRatio(row.expenseRatio)} />
                <Metric
                  label="日均成交"
                  value={`${fmtYi(row.avgDailyTurnoverYi)} 亿`}
                />
                <Metric
                  label="折溢价"
                  value={fmtPctPoints(row.premiumDiscount)}
                />
                <Metric
                  label="跟踪误差"
                  value={fmtPctPoints(row.trackingError)}
                />
              </div>
            </article>
          ))}
        </div>

        <aside className="rounded-2xl border border-[color:var(--border-color)] bg-[var(--correlation-card-tint)] p-5">
          <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[var(--correlation-brand)]">
            交易观察
          </p>
          <h4 className="mt-3 text-base font-semibold text-[var(--foreground)]">
            优先关注规模与成交额
          </h4>
          <p className="mt-2 text-xs leading-relaxed text-[var(--muted-foreground)]">
            规模与成交额更高的产品通常交易摩擦更低；折溢价与跟踪误差用于观察买入时点与复制质量。
          </p>

          {bestLiquidity ? (
            <div className="mt-5 rounded-xl border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] p-4">
              <p className="text-[11px] text-[var(--muted-foreground)]">
                流动性优先样本
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                {bestLiquidity.name}
              </p>
              <p className="mt-1 font-mono text-xs tabular-nums text-[var(--muted-foreground)]">
                {bestLiquidity.code} · 日均{" "}
                {fmtYi(bestLiquidity.avgDailyTurnoverYi)}亿
              </p>
            </div>
          ) : null}

          <ul className="mt-5 space-y-2 text-[11px] leading-relaxed text-[var(--muted-foreground)]">
            <li>· 管理费率越低，长期持有成本越友好。</li>
            <li>· 折溢价接近 0，通常代表二级市场价格更贴近净值。</li>
            <li>· 跟踪误差以数据源可用披露口径为准。</li>
          </ul>
        </aside>
      </div>
    </section>
  );
}

function EtfMatchTag({
  matchType,
}: {
  matchType: TrackingEtfRow["matchType"];
}) {
  if (matchType === "related") return <Tag color="gold">相关ETF</Tag>;
  return <Tag color="blue">精确跟踪</Tag>;
}

interface MetricProps {
  label: string;
  value: string;
}

function Metric({ label, value }: MetricProps) {
  return (
    <div className="rounded-lg border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] px-3 py-2">
      <p className="text-[10px] text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-1 font-mono text-xs tabular-nums text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}
