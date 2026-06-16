"use client";

import type { EtfPoolItem } from "@/types/etf";
import { InfoCircleOutlined, RightOutlined } from "@ant-design/icons";
import { Collapse } from "antd";
import Link from "next/link";

interface EtfDetailViewProps {
  etf: EtfPoolItem;
}

const METHODOLOGY_COLLAPSE_LABEL = "口径说明（行情中心 ETF 池）";

export function EtfDetailView({ etf }: EtfDetailViewProps) {
  return (
    <div className="space-y-10 pb-16">
      <header className="relative overflow-hidden rounded-2xl border border-[color:var(--border-color)] bg-[linear-gradient(135deg,var(--correlation-card-surface),var(--correlation-card-tint))] p-5 shadow-[0_18px_48px_color-mix(in_srgb,var(--foreground)_6%,transparent)] md:p-7">
        <div
          className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--correlation-brand)_14%,transparent),transparent_68%)]"
          aria-hidden
        />
        <div className="relative space-y-4">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)] lg:items-start">
            <div className="min-w-0">
              <nav
                aria-label="面包屑导航"
                className="mb-4 flex flex-wrap items-center gap-2 text-xs text-[var(--muted-foreground)]"
              >
                <Link
                  href="/indices"
                  className="rounded-sm text-[var(--correlation-brand)] transition hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--correlation-brand)]"
                >
                  行情中心
                </Link>
                <span aria-hidden className="text-[var(--muted-foreground)]/70">
                  /
                </span>
                <Link
                  href="/indices"
                  className="rounded-sm text-[var(--correlation-brand)] transition hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--correlation-brand)]"
                >
                  ETF池
                </Link>
                <span aria-hidden className="text-[var(--muted-foreground)]/70">
                  /
                </span>
                <span className="font-medium text-[var(--foreground)]">
                  {etf.etfName}
                </span>
              </nav>
              <p className="text-xs font-semibold tracking-[0.22em] text-[var(--correlation-brand)] uppercase">
                Market center · ETF
              </p>
              <h1 className="mt-3 text-3xl font-light tracking-tight text-[var(--foreground)] md:text-5xl">
                {etf.etfName}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] px-3 py-1 font-mono tabular-nums text-[var(--foreground)]">
                  {etf.etfCode}
                </span>
                <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] px-3 py-1 text-[var(--muted-foreground)]">
                  {etf.category}
                </span>
                <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] px-3 py-1 text-[var(--muted-foreground)]">
                  {etf.direction}
                </span>
                <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] px-3 py-1 text-[var(--muted-foreground)]">
                  {etf.source}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-[color:var(--border-color)] bg-[color-mix(in_srgb,var(--correlation-card-surface)_82%,transparent)] p-4">
              <div className="mb-4">
                <h2 className="text-base font-medium text-[var(--foreground)]">
                  交易观察
                </h2>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  基于 ETF 池字段展示规模、成交额、折溢价与费率。
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <MetricCard label="基金规模（亿）" value={fmtYi(etf.aumYi)} />
                <MetricCard
                  label="日均成交额（亿）"
                  value={fmtYi(etf.avgDailyTurnoverYi)}
                />
                <MetricCard
                  label="折溢价"
                  value={fmtSignedPct(etf.premiumDiscount)}
                />
                <MetricCard
                  label="费率"
                  value={fmtRatioPct(etf.expenseRatio)}
                />
              </div>
            </div>
          </div>

          <Collapse
            ghost
            bordered={false}
            expandIcon={({ isActive }) => (
              <RightOutlined aria-hidden rotate={isActive ? 90 : undefined} />
            )}
            className="rounded-xl border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] [&_.ant-collapse-content-box]:px-4 [&_.ant-collapse-content-box]:pt-0 [&_.ant-collapse-header]:px-4 [&_.ant-collapse-header]:py-3"
            items={[
              {
                key: "methodology",
                label: (
                  <span className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                    <InfoCircleOutlined aria-hidden />
                    {METHODOLOGY_COLLAPSE_LABEL}
                  </span>
                ),
                children: (
                  <p className="max-w-3xl text-xs leading-relaxed text-[var(--muted-foreground)]">
                    ETF
                    池优先来自行情中心指数详情聚合，缺失时使用保底清单补足；规模、成交额、折溢价与费率以当前数据源字段为准。
                  </p>
                ),
              },
            ]}
          />
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] xl:gap-8">
        <div className="rounded-2xl border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] p-5 shadow-[0_14px_36px_color-mix(in_srgb,var(--foreground)_5%,transparent)] md:p-6">
          <p className="text-xs font-semibold tracking-[0.18em] text-[var(--correlation-brand)] uppercase">
            ETF Profile
          </p>
          <h2 className="mt-2 text-2xl font-medium tracking-tight text-[var(--foreground)]">
            标的档案
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <InfoTile label="ETF 代码" value={etf.etfCode} isMono />
            <InfoTile label="ETF 名称" value={etf.etfName} />
            <InfoTile label="分类" value={etf.category} />
            <InfoTile label="方向" value={etf.direction} />
            <InfoTile
              label="跟踪指数"
              value={etf.trackingIndexName ?? "未映射"}
            />
            <InfoTile
              label="指数代码"
              value={etf.trackingIndexCode ?? "—"}
              isMono
            />
          </div>
        </div>

        <aside className="rounded-2xl border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--correlation-card-surface),color-mix(in_srgb,var(--correlation-card-tint)_72%,white))] p-5 shadow-[0_14px_36px_color-mix(in_srgb,var(--foreground)_5%,transparent)] md:p-6">
          <p className="text-xs font-semibold tracking-[0.18em] text-[var(--correlation-brand)] uppercase">
            Related Index
          </p>
          <h2 className="mt-2 text-lg font-medium tracking-wide text-[var(--foreground)]">
            跟踪指数
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-[var(--muted-foreground)]">
            ETF
            详情页与指数详情页保持一致路径，便于在产品与底层指数之间切换观察。
          </p>
          {etf.trackingIndexCode ? (
            <Link
              href={`/indices/${encodeURIComponent(etf.trackingIndexCode)}`}
              className="mt-5 inline-flex w-full items-center justify-center rounded-xl border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] px-4 py-3 text-sm font-medium text-[var(--correlation-brand)] transition hover:border-[color-mix(in_srgb,var(--correlation-brand)_42%,var(--border-color))] hover:shadow-[0_12px_26px_color-mix(in_srgb,var(--correlation-brand)_10%,transparent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--correlation-brand)]"
            >
              查看 {etf.trackingIndexName ?? etf.trackingIndexCode} →
            </Link>
          ) : (
            <div className="mt-5 rounded-xl border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] px-4 py-3 text-xs leading-relaxed text-[var(--muted-foreground)]">
              当前 ETF 暂未映射到站内指数详情页。
            </div>
          )}
        </aside>
      </section>

      <div className="text-center">
        <Link
          href="/indices"
          className="inline-block rounded-sm px-1 py-2 text-sm text-[var(--correlation-brand)] transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--correlation-brand)]"
        >
          ← 返回行情中心
        </Link>
      </div>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
}

function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-[color:var(--border-color)] bg-[color-mix(in_srgb,var(--correlation-card-surface)_78%,transparent)] p-4">
      <p className="text-[11px] text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-2 font-mono text-xl tabular-nums text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}

interface InfoTileProps {
  label: string;
  value: string;
  isMono?: boolean;
}

function InfoTile({ label, value, isMono = false }: InfoTileProps) {
  const valueClass = isMono ? "font-mono tabular-nums" : "";

  return (
    <div className="rounded-xl border border-[color:var(--border-color)] bg-[var(--correlation-card-tint)] px-4 py-3">
      <p className="text-[11px] text-[var(--muted-foreground)]">{label}</p>
      <p
        className={`mt-2 text-sm font-medium text-[var(--foreground)] ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}

function fmtYi(v: number | null): string {
  if (v === null) return "—";
  return v.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}

function fmtRatioPct(v: number | null): string {
  if (v === null) return "—";
  return `${(v * 100).toFixed(2)}%`;
}

function fmtSignedPct(v: number | null): string {
  if (v === null) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}
