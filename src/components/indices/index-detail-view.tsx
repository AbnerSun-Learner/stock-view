"use client";

import { IndexEtfTable } from "@/components/indices/index-etf-table";
import { IndexIndustryComposition } from "@/components/indices/index-industry-composition";
import { IndexPercentileWidgets } from "@/components/indices/index-percentile-widgets";
import { IndexPriceChart } from "@/components/indices/index-price-chart";
import { IndexValuationChart } from "@/components/indices/index-valuation-chart";
import {
  DEFAULT_INDEX_CHART_WINDOW,
  INDEX_CHART_WINDOW_OPTIONS,
} from "@/lib/indices/constants";
import {
  sliceAlignedValuation,
  slicePricesByChartWindow,
} from "@/lib/indices/slice-chart-window";
import type { IndexChartWindow, IndexDetailRecord } from "@/types/indices";
import { InfoCircleOutlined, RocketOutlined } from "@ant-design/icons";
import { Alert, Collapse, Segmented, Switch } from "antd";
import Link from "next/link";
import { useMemo, useState } from "react";

interface IndexDetailViewProps {
  detail: IndexDetailRecord;
}

function fmtPctile(v: number | null): string {
  if (v === null) return "—";
  return `${v.toFixed(1)}%`;
}

function fmtPe(v: number | null): string {
  if (v === null) return "—";
  return v.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}

export function IndexDetailView({ detail }: IndexDetailViewProps) {
  const [chartWindow, setChartWindow] = useState<IndexChartWindow>(
    DEFAULT_INDEX_CHART_WINDOW
  );
  const [showDd70, setShowDd70] = useState(false);
  const [showDd80, setShowDd80] = useState(false);

  const priceSlice = useMemo(
    () =>
      slicePricesByChartWindow(
        detail.fullHistoryPrices,
        chartWindow,
        detail.listingAnchorDate
      ),
    [detail.fullHistoryPrices, detail.listingAnchorDate, chartWindow]
  );

  const valuationSlice = useMemo(
    () =>
      sliceAlignedValuation(
        detail.fullHistoryValuation,
        chartWindow,
        detail.listingAnchorDate
      ),
    [detail.fullHistoryValuation, detail.listingAnchorDate, chartWindow]
  );

  const chartLabel =
    INDEX_CHART_WINDOW_OPTIONS.find((o) => o.value === chartWindow)?.label ??
    chartWindow;

  const pePct = detail.percentilePeByChartWindow[chartWindow];
  const pbPct = detail.percentilePbByChartWindow[chartWindow];

  const noValuationOverview = detail.peTtm === null && detail.pb === null;

  return (
    <div className="space-y-10 pb-16">
      <header className="space-y-3">
        <p className="text-xs font-medium tracking-[0.2em] uppercase text-[var(--muted-foreground)]">
          Index detail
        </p>
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-light tracking-tight text-[var(--foreground)]">
              {detail.name}
            </h1>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              <span className="font-mono tabular-nums">{detail.code}</span>
              <span className="mx-2 opacity-40">·</span>
              <span>{detail.category}</span>
            </p>
          </div>
          <div className="text-sm text-[var(--muted-foreground)]">
            数据截至{" "}
            <span className="font-mono text-[var(--foreground)]">
              {detail.asOfDate}
            </span>
          </div>
        </div>

        <Collapse
          ghost
          bordered={false}
          className="-mx-2 [&_.ant-collapse-header]:px-2 [&_.ant-collapse-content-box]:px-2 pt-1"
          items={[
            {
              key: "methodology",
              label: (
                <span className="text-sm text-[var(--muted-foreground)] inline-flex items-center gap-2">
                  <InfoCircleOutlined />
                  口径说明（MOCK 占位，接入数据后对齐全站 PE/PB 定义）
                </span>
              ),
              children: (
                <p className="text-xs leading-relaxed text-[var(--muted-foreground)] max-w-2xl">
                  PE（TTM）剔除亏损成分的处理规则、是否含港股通口径、缺失交易日插值方式等，均由数据源文档为准；
                  本站展示数值仅供演示路由与交互闭环。
                </p>
              ),
            },
          ]}
        />
      </header>

      <section className="rounded-xl border border-[color:var(--border-color)] bg-[var(--correlation-card-tint)] p-5 md:p-6 space-y-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)] mb-2">
              快照与所选走势区间概要
            </p>
            <p className="text-xs text-[var(--muted-foreground)] mb-2">
              PE / PB
              数值为截至日快照；分位与下方「价格指数走势」所选时间区间联动（MOCK）。
            </p>
            <p className="text-sm text-[var(--foreground)]">
              当前走势区间：
              <span className="font-medium ms-1">{chartLabel}</span>
            </p>
          </div>
          <div className="rounded-lg border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] px-4 py-3 text-xs text-[var(--muted-foreground)] inline-flex items-start gap-2 max-w-md">
            <RocketOutlined className="mt-0.5 shrink-0 opacity-70" />
            <span>
              M2 预留：网格测算、双标的对比等「下一步操作」将挂载于此区域（PRD
              §8）。
            </span>
          </div>
        </div>

        {noValuationOverview ? (
          <Alert
            type="info"
            showIcon
            message="暂无估值"
            description="示例指数历史或盈利口径不足以计算 PE / PB / 分位（MOCK 演练）。价格走势仍可按所选周期截取展示。"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {detail.peTtm !== null ? (
              <div className="rounded-lg border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] p-4">
                <p className="text-[11px] text-[var(--muted-foreground)] mb-1">
                  当前 PE（TTM）
                </p>
                <p className="text-xl font-mono tabular-nums text-[var(--foreground)]">
                  {fmtPe(detail.peTtm)}
                </p>
              </div>
            ) : null}
            <div className="rounded-lg border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] p-4">
              <p className="text-[11px] text-[var(--muted-foreground)] mb-1">
                {chartLabel} · PE 分位
              </p>
              <p className="text-xl font-mono tabular-nums text-[var(--foreground)]">
                {fmtPctile(pePct)}
              </p>
              <p className="text-[10px] text-[var(--muted-foreground)] mt-2 leading-snug">
                与下方走势图可见区间一致的演示口径。
              </p>
            </div>
            <div className="rounded-lg border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] p-4">
              <p className="text-[11px] text-[var(--muted-foreground)] mb-1">
                {chartLabel} · PB 分位
              </p>
              <p className="text-xl font-mono tabular-nums text-[var(--foreground)]">
                {fmtPctile(pbPct)}
              </p>
            </div>
            {detail.pb !== null ? (
              <div className="rounded-lg border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] p-4">
                <p className="text-[11px] text-[var(--muted-foreground)] mb-1">
                  当前 PB
                </p>
                <p className="text-xl font-mono tabular-nums text-[var(--foreground)]">
                  {fmtPe(detail.pb)}
                </p>
              </div>
            ) : null}
          </div>
        )}
      </section>

      <IndexPercentileWidgets
        gaugePePercentile={detail.gaugePePercentile}
        gaugePbPercentile={detail.gaugePbPercentile}
      />

      <section className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-medium text-[var(--foreground)] tracking-wide">
              价格指数走势
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Segmented<IndexChartWindow>
                size="middle"
                options={INDEX_CHART_WINDOW_OPTIONS}
                value={chartWindow}
                onChange={(v) => setChartWindow(v)}
              />
              <span className="sr-only">
                选择走势图时间区间，将同步截取估值走势图与上分位摘要
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end shrink-0">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] px-3 py-2 min-h-[44px] touch-manipulation"
            >
              <span className="text-[var(--muted-foreground)] text-sm whitespace-nowrap">
                70% 回撤水位
              </span>
              <Switch
                checked={showDd70}
                onChange={setShowDd70}
                aria-label="在价格指数走势图上显示自区间最高价回撤 70% 的参考水位"
              />
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] px-3 py-2 min-h-[44px] touch-manipulation"
            >
              <span className="text-[var(--muted-foreground)] text-sm whitespace-nowrap">
                80% 回撤水位
              </span>
              <Switch
                checked={showDd80}
                onChange={setShowDd80}
                aria-label="在价格指数走势图上显示自区间最高价回撤 80% 的参考水位"
              />
            </button>
          </div>
        </div>
        <IndexPriceChart
          series={priceSlice}
          windowLabel={chartLabel}
          showDrawdown70={showDd70}
          showDrawdown80={showDd80}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-[var(--foreground)] tracking-wide">
          估值走势
        </h2>
        <IndexValuationChart series={valuationSlice} windowLabel={chartLabel} />
      </section>

      <IndexIndustryComposition data={detail.industryComposition} />

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-[var(--foreground)] tracking-wide">
          跟踪 ETF
        </h2>
        <IndexEtfTable etfs={detail.etfs} />
      </section>

      <div className="text-center">
        <Link
          href="/indices"
          className="text-sm text-[var(--correlation-brand)] hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--correlation-brand)] rounded-sm px-1 py-2 inline-block"
        >
          ← 返回指数列表
        </Link>
      </div>
    </div>
  );
}
