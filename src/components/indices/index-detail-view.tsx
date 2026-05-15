"use client";

import { IndexIndustryComposition } from "@/components/indices/index-industry-composition";
import { IndexPercentileWidgets } from "@/components/indices/index-percentile-widgets";
import { IndexPriceChart } from "@/components/indices/index-price-chart";
import { IndexReturnAnalytics } from "@/components/indices/index-return-analytics";
import {
  DEFAULT_INDEX_CHART_WINDOW,
  INDEX_CHART_WINDOW_OPTIONS,
} from "@/lib/indices/constants";
import { slicePricesByChartWindow } from "@/lib/indices/slice-chart-window";
import type { IndexChartWindow, IndexDetailRecord } from "@/types/indices";
import { InfoCircleOutlined, RightOutlined } from "@ant-design/icons";
import { Collapse, Segmented, Switch } from "antd";
import Link from "next/link";
import { useMemo, useState } from "react";

interface IndexDetailViewProps {
  detail: IndexDetailRecord;
}

function fmtPctile(v: number | null): string {
  if (v === null) return "—";
  return `${v.toFixed(1)}%`;
}

function fmtPrice(v: number): string {
  return v.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const METHODOLOGY_COLLAPSE_LABEL = "口径说明（TuShare 指数行情与估值）";

export function IndexDetailView({ detail }: IndexDetailViewProps) {
  const [chartWindow, setChartWindow] = useState<IndexChartWindow>(
    DEFAULT_INDEX_CHART_WINDOW
  );
  const [isDrawdownLineVisible, setIsDrawdownLineVisible] = useState(false);

  const priceSlice = useMemo(
    () =>
      slicePricesByChartWindow(
        detail.fullHistoryPrices,
        chartWindow,
        detail.listingAnchorDate
      ),
    [detail.fullHistoryPrices, detail.listingAnchorDate, chartWindow]
  );

  const chartLabel =
    INDEX_CHART_WINDOW_OPTIONS.find((o) => o.value === chartWindow)?.label ??
    chartWindow;

  const extremeDrawdown = useMemo(
    () => getExtremeDrawdownStats(priceSlice),
    [priceSlice]
  );

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
                  指数
                </Link>
                <span aria-hidden className="text-[var(--muted-foreground)]/70">
                  /
                </span>
                <span className="font-medium text-[var(--foreground)]">
                  {detail.name}
                </span>
              </nav>
              <p className="text-xs font-semibold tracking-[0.22em] uppercase text-[var(--correlation-brand)]">
                Market center · Index
              </p>
              <h1 className="mt-3 text-3xl md:text-5xl font-light tracking-tight text-[var(--foreground)]">
                {detail.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] px-3 py-1 font-mono tabular-nums text-[var(--foreground)]">
                  {detail.code}
                </span>
                <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] px-3 py-1 text-[var(--muted-foreground)]">
                  {detail.category}
                </span>
                <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] px-3 py-1 text-[var(--muted-foreground)]">
                  数据截至
                  <span className="ms-2 font-mono tabular-nums text-[var(--foreground)]">
                    {detail.asOfDate}
                  </span>
                </span>
              </div>
            </div>
            <div className="rounded-2xl border border-[color:var(--border-color)] bg-[color-mix(in_srgb,var(--correlation-card-surface)_82%,transparent)] p-4">
              <div className="mb-3">
                <h2 className="text-base font-medium text-[var(--foreground)]">
                  PE / PB 估值百分位
                </h2>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  仪表盘数值范围为 <span className="font-mono">0–100</span>{" "}
                  历史分位
                </p>
              </div>
              <IndexPercentileWidgets
                gaugePePercentile={detail.gaugePePercentile}
                gaugePbPercentile={detail.gaugePbPercentile}
                peTtm={detail.peTtm}
                pb={detail.pb}
                isEmbedded
              />
            </div>
          </div>

          <Collapse
            ghost
            bordered={false}
            expandIcon={({ isActive }) => (
              <RightOutlined aria-hidden rotate={isActive ? 90 : undefined} />
            )}
            className="rounded-xl border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] [&_.ant-collapse-header]:px-4 [&_.ant-collapse-header]:py-3 [&_.ant-collapse-content-box]:px-4 [&_.ant-collapse-content-box]:pt-0"
            items={[
              {
                key: "methodology",
                label: (
                  <span className="text-sm text-[var(--muted-foreground)] inline-flex items-center gap-2">
                    <InfoCircleOutlined aria-hidden />
                    {METHODOLOGY_COLLAPSE_LABEL}
                  </span>
                ),
                children: (
                  <p className="text-xs leading-relaxed text-[var(--muted-foreground)] max-w-3xl">
                    PE（TTM）剔除亏损、港股通口径与缺失交易日处理以数据源为准；走势图区间最高价回撤水位基于当前可视序列内的最高收盘价。
                  </p>
                ),
              },
            ]}
          />
        </div>
      </header>

      <section className="space-y-4">
        <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] xl:gap-8">
          <div className="min-w-0 flex-1 space-y-4">
            <IndexPriceChart
              series={priceSlice}
              windowLabel={chartLabel}
              showDrawdown70={isDrawdownLineVisible}
              showDrawdown80={isDrawdownLineVisible}
              controls={
                <Segmented<IndexChartWindow>
                  size="middle"
                  options={INDEX_CHART_WINDOW_OPTIONS}
                  value={chartWindow}
                  onChange={(v) => setChartWindow(v)}
                />
              }
            />
          </div>
          <div className="h-full">
            <ExtremeDrawdownPanel
              isLineVisible={isDrawdownLineVisible}
              onLineVisibleChange={setIsDrawdownLineVisible}
              stats={extremeDrawdown}
            />
          </div>
        </div>
      </section>

      <IndexReturnAnalytics
        series={detail.fullHistoryPrices}
        indexName={detail.name}
      />

      <IndexIndustryComposition data={detail.industryComposition} />

      <div className="text-center">
        <Link
          href="/indices"
          className="text-sm text-[var(--correlation-brand)] hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--correlation-brand)] rounded-sm px-1 py-2 inline-block"
        >
          ← 返回行情中心
        </Link>
      </div>
    </div>
  );
}

interface ExtremeDrawdownStats {
  latestClose: number;
  peak: number;
  level70: number;
  level80: number;
  latestDrawdownPct: number;
}

interface ExtremeDrawdownPanelProps {
  stats: ExtremeDrawdownStats | null;
  isLineVisible: boolean;
  onLineVisibleChange: (checked: boolean) => void;
}

function getExtremeDrawdownStats(
  series: readonly { close: number }[]
): ExtremeDrawdownStats | null {
  if (series.length === 0) return null;

  const peak = Math.max(...series.map((point) => point.close));
  const latestClose = series[series.length - 1].close;

  return {
    latestClose,
    peak,
    level70: peak * 0.3,
    level80: peak * 0.2,
    latestDrawdownPct: (latestClose / peak - 1) * 100,
  };
}

function ExtremeDrawdownPanel({
  stats,
  isLineVisible,
  onLineVisibleChange,
}: ExtremeDrawdownPanelProps) {
  if (!stats) return null;

  return (
    <section className="flex h-full flex-col rounded-2xl border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--correlation-card-surface),color-mix(in_srgb,var(--correlation-card-tint)_72%,white))] p-5 shadow-[0_14px_36px_color-mix(in_srgb,var(--foreground)_5%,transparent)] md:p-6">
      <div className="flex items-start justify-between gap-4 border-b border-[color:var(--border-color)] pb-4">
        <div>
          <h2 className="inline-flex items-center gap-1.5 text-lg font-medium tracking-wide text-[var(--foreground)]">
            极限跌幅
          </h2>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            指数从最高点下跌 <span className="font-mono">70%</span>、
            <span className="font-mono">80%</span> 的点位数据
          </p>
        </div>
        <div className="rounded-full border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] px-2 py-1 shadow-[0_8px_18px_color-mix(in_srgb,var(--foreground)_4%,transparent)]">
          <Switch
            checked={isLineVisible}
            onChange={onLineVisibleChange}
            aria-label="在价格走势图中显示七十和八十水位线"
          />
        </div>
      </div>

      <div className="mt-5 grid flex-1 content-between gap-3">
        <ExtremeDrawdownMetric
          title="收盘"
          value={fmtPrice(stats.latestClose)}
          secondaryLabel="距最高点下跌"
          secondaryValue={fmtPctile(
            Math.abs(stats.latestDrawdownPct) < 0.005
              ? 0
              : stats.latestDrawdownPct
          )}
          tone={stats.latestDrawdownPct >= 0 ? "profit" : "loss"}
        />
        <ExtremeDrawdownMetric
          title="70 水位线"
          value={fmtPrice(stats.level70)}
          secondaryLabel="距收盘涨跌"
          secondaryValue="-70.00%"
          tone="profit"
        />
        <ExtremeDrawdownMetric
          title="80 水位线"
          value={fmtPrice(stats.level80)}
          secondaryLabel="距收盘涨跌"
          secondaryValue="-80.00%"
          tone="profit"
        />
      </div>
    </section>
  );
}

interface ExtremeDrawdownMetricProps {
  title: string;
  value: string;
  secondaryLabel: string;
  secondaryValue: string;
  tone: "profit" | "loss";
}

function ExtremeDrawdownMetric({
  title,
  value,
  secondaryLabel,
  secondaryValue,
  tone,
}: ExtremeDrawdownMetricProps) {
  const toneClass =
    tone === "profit" ? "text-[var(--profit)]" : "text-[var(--loss)]";

  return (
    <div className="rounded-2xl border border-[color:var(--border-color)] bg-[color-mix(in_srgb,var(--correlation-card-surface)_88%,white)] p-4 shadow-[0_8px_20px_color-mix(in_srgb,var(--foreground)_3%,transparent)]">
      <h3 className="text-sm font-medium text-[var(--foreground)]">{title}</h3>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-medium text-[var(--muted-foreground)]">
            点位
          </p>
          <p className="mt-1 font-mono text-lg tabular-nums text-[var(--foreground)]">
            {value}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-[var(--muted-foreground)]">
            {secondaryLabel}
          </p>
          <p className={`mt-1 font-mono text-lg tabular-nums ${toneClass}`}>
            {secondaryValue}
          </p>
        </div>
      </div>
    </div>
  );
}
