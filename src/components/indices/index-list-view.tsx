"use client";

import { groupEtfPoolByCategory } from "@/lib/etfs/etf-pool";
import type { EtfPoolItem } from "@/types/etf";
import type {
  IndexCategory,
  IndexListRow,
  IndexListSnapshotNotice,
} from "@/types/indices";
import { Empty, Segmented, Tag } from "antd";
import Link from "next/link";
import { useMemo, useState } from "react";

const VISIBLE_CATEGORIES: IndexCategory[] = ["宽基", "行业"];
const MARKET_VIEW_OPTIONS = [
  { label: "指数", value: "indices" },
  { label: "ETF池", value: "etfs" },
] satisfies Array<{ label: string; value: MarketCenterView }>;

type MarketCenterView = "indices" | "etfs";

interface CategoryCopy {
  eyebrow: string;
  description: string;
}

const CATEGORY_COPY: Record<IndexCategory, CategoryCopy> = {
  宽基: {
    eyebrow: "Broad Market",
    description: "覆盖主要市场宽基指数，适合快速观察大盘与核心资产状态。",
  },
  行业: {
    eyebrow: "Industry Index",
    description: "聚焦细分行业指数，便于对比不同赛道的价格位置。",
  },
  主题: {
    eyebrow: "Theme Index",
    description: "围绕主题策略构建的指数。",
  },
  跨境: {
    eyebrow: "Cross Border",
    description: "覆盖跨境资产的指数。",
  },
};

function fmtNumber(v: number | null, digits = 2): string {
  if (v === null) return "—";
  return v.toLocaleString("zh-CN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function fmtPct(v: number | null): string {
  if (v === null) return "—";
  return `${v.toFixed(1)}%`;
}

function fmtRatioPct(v: number | null): string {
  if (v === null) return "—";
  return `${(v * 100).toFixed(2)}%`;
}

function fmtSignedPct(v: number | null): string {
  if (v === null) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

function fmtDateTime(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

interface IndexListViewProps {
  initialRows: IndexListRow[];
  notice: IndexListSnapshotNotice;
  etfPool: EtfPoolItem[];
}

export function IndexListView({
  initialRows,
  notice,
  etfPool,
}: IndexListViewProps) {
  const [activeView, setActiveView] = useState<MarketCenterView>("indices");
  const sections = useMemo(() => {
    return VISIBLE_CATEGORIES.map((category) => {
      const rows = initialRows
        .filter((row) => row.category === category)
        .sort((a, b) => a.displayOrder - b.displayOrder);
      return { category, rows };
    }).filter((section) => section.rows.length > 0);
  }, [initialRows]);
  const exactEtfMap = useMemo(() => buildExactEtfMap(etfPool), [etfPool]);
  const etfSections = useMemo(() => groupEtfPoolByCategory(etfPool), [etfPool]);

  return (
    <div className="space-y-8 pb-16">
      <header className="mb-10 lg:mb-12">
        <div className="ds-section-label">
          <span className="ds-section-label__text">Market Center</span>
        </div>
        <h1 className="font-display mb-4 text-3xl font-light text-[var(--foreground)] md:text-[2.75rem] md:leading-[1.12]">
          行情中心
        </h1>
        <p className="max-w-xl text-[15px] leading-[1.8] text-[var(--muted-foreground)]">
          按指数与 ETF
          池浏览核心资产，快速查看市场位置，并进入详情页分析走势与产品档案。
        </p>
        <SnapshotNotice notice={notice} />
        <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] p-3 shadow-[0_10px_28px_color-mix(in_srgb,var(--foreground)_4%,transparent)] sm:flex-row sm:items-center sm:justify-between">
          <div className="px-1">
            <p className="text-sm font-medium text-[var(--foreground)]">
              选择资产视图
            </p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              指数与 ETF 池分开浏览，避免卡片列表过长。
            </p>
          </div>
          <Segmented<MarketCenterView>
            options={MARKET_VIEW_OPTIONS}
            value={activeView}
            onChange={setActiveView}
            aria-label="切换行情中心资产视图"
          />
        </div>
      </header>

      {activeView === "indices" ? (
        <IndexMarketView
          sections={sections}
          exactEtfMap={exactEtfMap}
          notice={notice}
        />
      ) : (
        <EtfPoolMarketView sections={etfSections} />
      )}
    </div>
  );
}

interface IndexMarketViewProps {
  sections: Array<{ category: IndexCategory; rows: IndexListRow[] }>;
  exactEtfMap: Map<string, EtfPoolItem[]>;
  notice: IndexListSnapshotNotice;
}

function IndexMarketView({
  sections,
  exactEtfMap,
  notice,
}: IndexMarketViewProps) {
  if (sections.length === 0) {
    return (
      <div className="rounded-2xl border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] p-10 text-center shadow-[0_14px_36px_color-mix(in_srgb,var(--foreground)_5%,transparent)]">
        <Empty description={notice.title} />
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[var(--muted-foreground)]">
          {notice.description}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <IndexCategorySection
          key={section.category}
          category={section.category}
          rows={section.rows}
          exactEtfMap={exactEtfMap}
        />
      ))}
    </div>
  );
}

interface EtfPoolMarketViewProps {
  sections: ReturnType<typeof groupEtfPoolByCategory>;
}

function EtfPoolMarketView({ sections }: EtfPoolMarketViewProps) {
  if (sections.length === 0) {
    return (
      <div className="rounded-2xl border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] p-10 text-center shadow-[0_14px_36px_color-mix(in_srgb,var(--foreground)_5%,transparent)]">
        <Empty description="暂无可展示 ETF 池" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <EtfPoolSection
          key={section.category}
          category={section.category}
          items={section.items}
        />
      ))}
    </div>
  );
}

interface SnapshotNoticeProps {
  notice: IndexListSnapshotNotice;
}

function SnapshotNotice({ notice }: SnapshotNoticeProps) {
  const generatedAt = fmtDateTime(notice.generatedAt);
  const statusLabel =
    notice.status === "ready"
      ? "数据已更新"
      : notice.status === "updating"
      ? "更新中"
      : "不可用";

  return (
    <div className="mt-5 rounded-2xl border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] px-4 py-3 shadow-[0_10px_28px_color-mix(in_srgb,var(--foreground)_4%,transparent)]">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--foreground)]">
            {notice.title}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--muted-foreground)]">
            {notice.description}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] text-[var(--muted-foreground)]">
          <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--correlation-card-tint)] px-2.5 py-1">
            {statusLabel}
          </span>
          {notice.marketDate ? (
            <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--correlation-card-tint)] px-2.5 py-1">
              截至 {notice.marketDate}
            </span>
          ) : null}
          {generatedAt ? (
            <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--correlation-card-tint)] px-2.5 py-1">
              生成 {generatedAt}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

interface IndexCategorySectionProps {
  category: IndexCategory;
  rows: IndexListRow[];
  exactEtfMap: Map<string, EtfPoolItem[]>;
}

function IndexCategorySection({
  category,
  rows,
  exactEtfMap,
}: IndexCategorySectionProps) {
  const copy = CATEGORY_COPY[category];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] p-4 shadow-[0_14px_36px_color-mix(in_srgb,var(--foreground)_5%,transparent)] sm:p-5 lg:p-6">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_18%_0%,color-mix(in_srgb,var(--correlation-brand)_10%,transparent),transparent_58%)]"
        aria-hidden
      />
      <div className="relative flex flex-col gap-3 border-b border-[color:var(--border-color)] pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] uppercase text-[var(--correlation-brand)]">
            {copy.eyebrow}
          </p>
          <h2 className="mt-1 text-xl font-medium tracking-wide text-[var(--foreground)]">
            {category}指数
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted-foreground)]">
            {copy.description}
          </p>
        </div>
        <div className="rounded-full border border-[color:var(--border-color)] bg-[var(--correlation-card-tint)] px-3 py-1.5 text-xs text-[var(--muted-foreground)]">
          共{" "}
          <span className="font-mono font-semibold tabular-nums text-[var(--foreground)]">
            {rows.length}
          </span>{" "}
          个
        </div>
      </div>

      <div className="relative mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {rows.map((row) => (
          <IndexCard
            key={row.code}
            row={row}
            exactEtfs={exactEtfMap.get(row.code) ?? []}
          />
        ))}
      </div>
    </section>
  );
}

interface IndexCardProps {
  row: IndexListRow;
  exactEtfs: EtfPoolItem[];
}

function IndexCard({ row, exactEtfs }: IndexCardProps) {
  const visibleEtfs = exactEtfs.slice(0, 2);
  const extraCount = Math.max(0, exactEtfs.length - visibleEtfs.length);

  return (
    <article className="group flex min-h-[13rem] flex-col justify-between rounded-2xl border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--correlation-card-surface),color-mix(in_srgb,var(--correlation-card-tint)_46%,var(--correlation-card-surface)))] p-4 text-left shadow-[0_10px_28px_color-mix(in_srgb,var(--foreground)_4%,transparent)] transition duration-200 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--correlation-brand)_48%,var(--border-color))] hover:shadow-[0_18px_34px_color-mix(in_srgb,var(--correlation-brand)_12%,transparent)]">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[var(--correlation-card-tint)] px-2.5 py-1 text-[11px] font-semibold text-[var(--correlation-brand)] ring-1 ring-[color-mix(in_srgb,var(--correlation-brand)_20%,var(--border-color))]">
                {row.category}
              </span>
              <span className="font-mono text-[11px] tabular-nums text-[var(--muted-foreground)]">
                {row.code}
              </span>
            </div>
            <h3 className="mt-4 truncate text-xl font-semibold tracking-tight text-[var(--foreground)]">
              {row.name}
            </h3>
            <p className="mt-2 font-mono text-[11px] leading-none text-[var(--muted-foreground)]">
              更新 {row.asOfDate}
            </p>
          </div>
          <Link
            href={`/indices/${encodeURIComponent(row.code)}`}
            className="shrink-0 rounded-full border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--correlation-brand)] transition group-hover:translate-x-0.5 group-hover:border-[color-mix(in_srgb,var(--correlation-brand)_38%,var(--border-color))] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--correlation-brand)]"
            aria-label={`查看${row.name}详情`}
          >
            查看详情 →
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <MetricTile label="收盘价" value={fmtNumber(row.close)} />
        <MetricTile
          label="距历史最高"
          value={fmtPct(row.drawdownFromHighPct)}
        />
      </div>

      {visibleEtfs.length > 0 ? (
        <div className="mt-4 space-y-2 border-t border-[color:var(--border-color)] pt-3">
          <p className="text-[11px] text-[var(--muted-foreground)]">
            精确跟踪 ETF
          </p>
          <div className="flex flex-wrap gap-2">
            {visibleEtfs.map((item) => (
              <Link
                key={item.etfCode}
                href={`/etfs/${encodeURIComponent(item.etfCode)}`}
                className="max-w-full rounded-full bg-[var(--correlation-card-tint)] px-2.5 py-1 text-[11px] text-[var(--correlation-brand)] transition hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--correlation-brand)]"
              >
                <span className="font-mono">{item.etfCode}</span>
                <span className="ml-1">{item.etfName}</span>
              </Link>
            ))}
            {extraCount > 0 ? (
              <Tag className="m-0 rounded-full border-0 bg-[var(--correlation-card-tint)] px-2.5 py-1 text-[11px] text-[var(--muted-foreground)]">
                +{extraCount}
              </Tag>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}

interface MetricTileProps {
  label: string;
  value: string;
}

function MetricTile({ label, value }: MetricTileProps) {
  return (
    <div className="rounded-xl border border-[color:var(--border-color)] bg-[color-mix(in_srgb,var(--correlation-card-surface)_78%,transparent)] px-3 py-3">
      <p className="text-[11px] leading-none text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="mt-2 font-mono text-base font-semibold tabular-nums text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}

interface EtfPoolSectionProps {
  category: string;
  items: EtfPoolItem[];
}

function EtfPoolSection({ category, items }: EtfPoolSectionProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] p-4 shadow-[0_14px_36px_color-mix(in_srgb,var(--foreground)_5%,transparent)] sm:p-5 lg:p-6">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_18%_0%,color-mix(in_srgb,var(--correlation-brand)_10%,transparent),transparent_58%)]"
        aria-hidden
      />
      <div className="relative flex flex-col gap-3 border-b border-[color:var(--border-color)] pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] uppercase text-[var(--correlation-brand)]">
            ETF Pool
          </p>
          <h2 className="mt-1 text-xl font-medium tracking-wide text-[var(--foreground)]">
            {category} ETF
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted-foreground)]">
            按方向、规模与成交额整理的 ETF 池，点击卡片查看 ETF 档案。
          </p>
        </div>
        <div className="rounded-full border border-[color:var(--border-color)] bg-[var(--correlation-card-tint)] px-3 py-1.5 text-xs text-[var(--muted-foreground)]">
          共{" "}
          <span className="font-mono font-semibold tabular-nums text-[var(--foreground)]">
            {items.length}
          </span>{" "}
          个
        </div>
      </div>

      <div className="relative mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <EtfPoolCard key={item.etfCode} item={item} />
        ))}
      </div>
    </section>
  );
}

interface EtfPoolCardProps {
  item: EtfPoolItem;
}

function EtfPoolCard({ item }: EtfPoolCardProps) {
  return (
    <Link
      href={`/etfs/${encodeURIComponent(item.etfCode)}`}
      className="group flex min-h-[14rem] flex-col justify-between rounded-2xl border border-[color:var(--border-color)] bg-[linear-gradient(180deg,var(--correlation-card-surface),color-mix(in_srgb,var(--correlation-card-tint)_46%,var(--correlation-card-surface)))] p-4 text-left shadow-[0_10px_28px_color-mix(in_srgb,var(--foreground)_4%,transparent)] transition duration-200 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--correlation-brand)_48%,var(--border-color))] hover:shadow-[0_18px_34px_color-mix(in_srgb,var(--correlation-brand)_12%,transparent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--correlation-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--page-bg)]"
      aria-label={`查看${item.etfName}详情`}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[var(--correlation-card-tint)] px-2.5 py-1 text-[11px] font-semibold text-[var(--correlation-brand)] ring-1 ring-[color-mix(in_srgb,var(--correlation-brand)_20%,var(--border-color))]">
                {item.direction}
              </span>
              <span className="font-mono text-[11px] tabular-nums text-[var(--muted-foreground)]">
                {item.etfCode}
              </span>
            </div>
            <h3 className="mt-4 truncate text-xl font-semibold tracking-tight text-[var(--foreground)]">
              {item.etfName}
            </h3>
            <p className="mt-2 truncate text-xs text-[var(--muted-foreground)]">
              跟踪 {item.trackingIndexName ?? "未映射指数"}
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--correlation-brand)] transition group-hover:translate-x-0.5 group-hover:border-[color-mix(in_srgb,var(--correlation-brand)_38%,var(--border-color))]">
            查看详情 →
          </span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <MetricTile label="规模（亿）" value={fmtNumber(item.aumYi)} />
        <MetricTile
          label="日均成交（亿）"
          value={fmtNumber(item.avgDailyTurnoverYi)}
        />
        <MetricTile label="折溢价" value={fmtSignedPct(item.premiumDiscount)} />
        <MetricTile label="费率" value={fmtRatioPct(item.expenseRatio)} />
      </div>
    </Link>
  );
}

function buildExactEtfMap(
  etfPool: readonly EtfPoolItem[]
): Map<string, EtfPoolItem[]> {
  const map = new Map<string, EtfPoolItem[]>();
  for (const item of etfPool) {
    if (!item.trackingIndexCode) continue;
    const rows = map.get(item.trackingIndexCode) ?? [];
    rows.push(item);
    map.set(item.trackingIndexCode, rows);
  }

  for (const [code, rows] of map) {
    map.set(
      code,
      [...rows].sort((a, b) => {
        const amountDelta =
          (b.avgDailyTurnoverYi ?? -1) - (a.avgDailyTurnoverYi ?? -1);
        if (amountDelta !== 0) return amountDelta;

        const aumDelta = (b.aumYi ?? -1) - (a.aumYi ?? -1);
        if (aumDelta !== 0) return aumDelta;

        return a.etfCode.localeCompare(b.etfCode);
      })
    );
  }

  return map;
}





