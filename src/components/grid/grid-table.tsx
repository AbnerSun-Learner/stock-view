"use client";

import type { GridRow } from "@/types/grid";
import { HelpCircle } from "lucide-react";

interface GridTableProps {
  gridData: GridRow[];
  priceDecimals: number;
}

export function GridTable({ gridData, priceDecimals }: GridTableProps) {
  const sortedData = [...gridData].sort((a, b) => b.position - a.position);
  const firstPositionByType = new Map<string, number>();
  sortedData.forEach((row) => {
    if (!firstPositionByType.has(row.gridType)) {
      firstPositionByType.set(row.gridType, row.position);
    }
  });

  const gridTypeStyle = {
    小网: { color: "#000000", bg: "transparent" },
    中网: { color: "#666666", bg: "transparent" },
    大网: { color: "#999999", bg: "transparent" },
  } as Record<string, { color: string; bg: string }>;

  return (
    <div className="overflow-x-auto border border-[color:var(--border-color)]">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[color:var(--border-color)] bg-[#f5f5f5] dark:bg-[#1a1a1a]">
            {[
              { label: "类型" },
              { label: "档位" },
              { label: "买入价" },
              {
                label: "跌幅",
                tooltip: "相对于上一档位的跌幅",
              },
              { label: "买入金额" },
              { label: "买入股数" },
              { label: "卖出价" },
              { label: "卖出股数" },
              { label: "卖出金额" },
            ].map((col) => (
              <th
                key={col.label}
                className="p-4 text-left text-[10px] font-medium uppercase text-[var(--muted-foreground)]"
                style={{ letterSpacing: "0.08em" }}
              >
                {col.tooltip ? (
                  <div className="flex items-center gap-1">
                    <span>{col.label}</span>
                    <div className="group relative">
                      <HelpCircle
                        className="w-3 h-3 cursor-help opacity-50"
                        strokeWidth={1.5}
                      />
                      <div className="absolute left-0 top-full mt-2 hidden group-hover:block z-[99999] w-48 p-2 text-xs bg-[var(--foreground)] text-[var(--page-bg)] whitespace-normal font-normal pointer-events-none">
                        {col.tooltip}
                      </div>
                    </div>
                  </div>
                ) : (
                  col.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, index) => {
            const isFirstPosition =
              (row.gridType === "中网" || row.gridType === "大网") &&
              firstPositionByType.get(row.gridType) === row.position;

            const displayDropRate =
              isFirstPosition && row.priceDropRate > 0
                ? -row.priceDropRate
                : row.priceDropRate;

            const typeStyle = gridTypeStyle[row.gridType] ?? {
              color: "var(--foreground)",
              bg: "transparent",
            };

            return (
              <tr
                key={index}
                className="border-b border-[color:var(--border-color)] hover:bg-[var(--hover-bg)] transition-colors duration-200"
              >
                <td className="p-4">
                  <span
                    className="text-xs font-medium"
                    style={{ color: typeStyle.color, letterSpacing: "0.03em" }}
                  >
                    {row.gridType}
                  </span>
                </td>
                <td className="p-4 text-sm text-[var(--foreground)]">
                  {row.position.toFixed(2)}
                </td>
                <td className="p-4 text-sm text-[var(--foreground)]">
                  {row.buyPrice.toFixed(priceDecimals)}
                </td>
                <td
                  className="p-4 text-sm font-medium"
                  style={{
                    color:
                      displayDropRate < 0 ? "var(--loss)" : "var(--foreground)",
                  }}
                >
                  {displayDropRate === 0
                    ? "—"
                    : `${displayDropRate.toFixed(2)}%`}
                </td>
                <td className="p-4 text-sm text-[var(--foreground)]">
                  {row.buyAmount.toLocaleString()}
                </td>
                <td className="p-4 text-sm text-[var(--foreground)]">
                  {row.buyShares.toLocaleString()}
                </td>
                <td className="p-4 text-sm text-[var(--foreground)]">
                  {row.sellPrice.toFixed(priceDecimals)}
                </td>
                <td className="p-4 text-sm text-[var(--foreground)]">
                  {row.sellShares.toLocaleString()}
                </td>
                <td className="p-4 text-sm text-[var(--foreground)]">
                  {row.sellAmount.toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
