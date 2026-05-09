"use client";

import type {
  EtfProfile,
  HoldingItemMock,
  SectorWeight,
} from "@/lib/correlation/etf-profiles";
import type { PairCorrelationData } from "@/lib/correlation/pair-correlation-types";

interface PairCompareTableProps {
  data: PairCorrelationData;
}

interface CompareRow {
  label: string;
  /** 用于打印的副标题（英文） */
  subLabel?: string;
  render: (profile: EtfProfile) => React.ReactNode;
}

function formatAum(aum: number): string {
  if (aum <= 0) return "—";
  if (aum >= 1000) return `${(aum / 1000).toFixed(2)} 千亿元`;
  return `${aum.toFixed(0)} 亿元`;
}

function formatExpense(rate: number): string {
  if (!rate) return "—";
  return `${(rate * 100).toFixed(2)}%`;
}

function SectorList({ sectors }: { sectors: SectorWeight[] }) {
  if (!sectors.length)
    return <span className="text-[var(--muted-foreground)]">—</span>;
  return (
    <ul className="space-y-1">
      {sectors.slice(0, 4).map((s) => (
        <li
          key={s.name}
          className="flex items-baseline justify-between gap-3 text-xs"
        >
          <span className="text-[var(--foreground)]">{s.name}</span>
          <span className="font-mono tabular-nums text-[var(--muted-foreground)]">
            {(s.weight * 100).toFixed(1)}%
          </span>
        </li>
      ))}
    </ul>
  );
}

function HoldingsList({ items }: { items: HoldingItemMock[] }) {
  if (!items.length)
    return <span className="text-[var(--muted-foreground)]">—</span>;
  return (
    <ul className="space-y-1">
      {items.slice(0, 5).map((h) => (
        <li
          key={h.name}
          className="flex items-baseline justify-between gap-3 text-xs"
        >
          <span className="text-[var(--foreground)]">{h.name}</span>
          <span className="font-mono tabular-nums text-[var(--muted-foreground)]">
            {(h.weight * 100).toFixed(2)}%
          </span>
        </li>
      ))}
    </ul>
  );
}

const ROWS: CompareRow[] = [
  {
    label: "名称",
    subLabel: "Name",
    render: (p) => <span className="text-[var(--foreground)]">{p.name}</span>,
  },
  {
    label: "跟踪指数",
    subLabel: "Tracking Index",
    render: (p) => (
      <span className="text-[var(--foreground)]">{p.trackingIndex}</span>
    ),
  },
  {
    label: "资产规模",
    subLabel: "Assets Under Management",
    render: (p) => (
      <span className="text-[var(--foreground)]">{formatAum(p.aum)}</span>
    ),
  },
  {
    label: "综合费率",
    subLabel: "Expense Ratio",
    render: (p) => (
      <span className="text-[var(--foreground)]">
        {formatExpense(p.expenseRatio)}
      </span>
    ),
  },
  {
    label: "上市年份",
    subLabel: "Listed Year",
    render: (p) => (
      <span className="text-[var(--foreground)]">
        {p.listedYear ? p.listedYear : "—"}
      </span>
    ),
  },
  {
    label: "前 4 大行业",
    subLabel: "Top Sector Weights",
    render: (p) => <SectorList sectors={p.topSectors} />,
  },
  {
    label: "前 5 大持仓",
    subLabel: "Top Holdings",
    render: (p) => <HoldingsList items={p.topHoldings} />,
  },
];

export function PairCompareTable({ data }: PairCompareTableProps) {
  return (
    <div className="correlation-card p-6 md:p-8">
      <div className="mb-6">
        <p className="correlation-eyebrow text-xs font-semibold tracking-[0.2em] uppercase">
          ETF Comparison
        </p>
        <h3 className="mt-2 text-lg font-light text-[var(--foreground)]">
          ETF 对比
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-y border-[color:var(--border-color)]">
              <th className="py-3 px-4 text-left text-[11px] font-medium tracking-[0.16em] uppercase text-[var(--muted-foreground)] w-1/4 bg-[var(--correlation-card-tint)]">
                Ticker
              </th>
              <th className="correlation-table-head-code py-3 px-4 text-left text-[11px] font-semibold tracking-[0.16em] uppercase">
                <span className="font-mono text-base">{data.a.code}</span>
              </th>
              <th className="correlation-table-head-code py-3 px-4 text-left text-[11px] font-semibold tracking-[0.16em] uppercase">
                <span className="font-mono text-base">{data.b.code}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr
                key={row.label}
                className="border-b border-[color:var(--border-color)] last:border-b-0 align-top"
              >
                <td className="py-4 px-4 w-1/4">
                  <p className="text-sm text-[var(--foreground)]">
                    {row.label}
                  </p>
                  {row.subLabel ? (
                    <p className="mt-0.5 text-[10px] tracking-[0.16em] uppercase text-[var(--muted-foreground)]">
                      {row.subLabel}
                    </p>
                  ) : null}
                </td>
                <td className="py-4 px-4 text-sm">{row.render(data.a)}</td>
                <td className="py-4 px-4 text-sm">{row.render(data.b)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
