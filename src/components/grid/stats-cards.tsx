"use client";

import type { StressTest } from "@/types/grid";
import { HelpCircle } from "lucide-react";

interface StatsCardsProps {
  stressTest: StressTest;
}

export function StatsCards({ stressTest }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-0 border border-[color:var(--border-color)] mb-8">
      {[
        {
          label: "总买入金额",
          value: stressTest.totalBuyAmount.toLocaleString(),
          color: null,
          tooltip: null,
        },
        {
          label: "总卖出金额",
          value: stressTest.totalSellAmount.toLocaleString(),
          color: null,
          tooltip: null,
        },
        {
          label: "剩余股数",
          value: stressTest.remainingShares.toLocaleString(),
          color: null,
          tooltip: "剩余股数 = 总买入股数 - 总卖出股数",
        },
        {
          label: "预期利润",
          value:
            (stressTest.profit > 0 ? "+" : "") +
            stressTest.profit.toLocaleString(),
          color:
            stressTest.profit > 0
              ? "var(--profit)"
              : stressTest.profit < 0
              ? "var(--loss)"
              : null,
          tooltip: "利润 = 卖出金额 - 买入金额 + 剩余股数 × 基准价",
        },
        {
          label: "收益率",
          value:
            (stressTest.profitRate > 0 ? "+" : "") +
            stressTest.profitRate +
            "%",
          color:
            stressTest.profitRate > 0
              ? "var(--profit)"
              : stressTest.profitRate < 0
              ? "var(--loss)"
              : null,
          tooltip: "利润 / 买入金额 × 100",
        },
      ].map((item, i) => (
        <div
          key={i}
          className="p-5 border-r border-b md:border-b-0 border-[color:var(--border-color)] last:border-r-0"
        >
          <div className="flex items-center gap-1 mb-3">
            <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
              {item.label}
            </span>
            {item.tooltip && (
              <div className="group relative">
                <HelpCircle
                  className="w-3 h-3 cursor-help text-[var(--muted-foreground)] opacity-50"
                  strokeWidth={1.5}
                />
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-[99999] w-48 p-2 text-xs bg-[var(--foreground)] text-[var(--page-bg)] whitespace-normal pointer-events-none">
                  {item.tooltip}
                </div>
              </div>
            )}
          </div>
          <div
            className="text-xl font-light"
            style={{
              color: item.color ?? "var(--foreground)",
              letterSpacing: "-0.01em",
            }}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}
