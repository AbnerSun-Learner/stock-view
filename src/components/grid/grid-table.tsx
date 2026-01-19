"use client";

import { HelpCircle } from "lucide-react";
import type { GridRow } from "@/types/grid";

interface GridTableProps {
  gridData: GridRow[];
  priceDecimals: number;
}

export function GridTable({ gridData, priceDecimals }: GridTableProps) {
  // 找出每个网格类型的第一档位（position 最大的）
  const sortedData = [...gridData].sort((a, b) => b.position - a.position);
  const firstPositionByType = new Map<string, number>();
  sortedData.forEach((row) => {
    if (!firstPositionByType.has(row.gridType)) {
      firstPositionByType.set(row.gridType, row.position);
    }
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-blue-50/50 dark:border-white/5">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-blue-100/50 dark:border-white/5 bg-blue-50/30 dark:bg-blue-900/10">
            <th className="p-4 text-left text-xs font-bold uppercase tracking-widest text-[#243B53] dark:text-blue-100 opacity-70">
              网格类型
            </th>
            <th className="p-4 text-left text-xs font-bold uppercase tracking-widest text-[#243B53] dark:text-blue-100 opacity-70">
              档位
            </th>
            <th className="p-4 text-left text-xs font-bold uppercase tracking-widest text-[#243B53] dark:text-blue-100 opacity-70">
              买入价
            </th>
            <th className="p-4 text-left text-xs font-bold uppercase tracking-widest text-[#243B53] dark:text-blue-100 opacity-70">
              <div className="flex items-center gap-1">
                <span>跌幅</span>
                <div className="group relative">
                  <HelpCircle className="w-3 h-3 cursor-help text-slate-400" />
                  <div className="absolute left-0 top-full mt-2 hidden group-hover:block z-[99999] w-48 p-2 text-xs rounded-lg bg-slate-900 text-slate-100 shadow-lg whitespace-normal font-normal pointer-events-none">
                    相对于上一档位的跌幅
                  </div>
                </div>
              </div>
            </th>
            <th className="p-4 text-left text-xs font-bold uppercase tracking-widest text-[#243B53] dark:text-blue-100 opacity-70">
              买入金额
            </th>
            <th className="p-4 text-left text-xs font-bold uppercase tracking-widest text-[#243B53] dark:text-blue-100 opacity-70">
              买入股数
            </th>
            <th className="p-4 text-left text-xs font-bold uppercase tracking-widest text-[#243B53] dark:text-blue-100 opacity-70">
              卖出价
            </th>
            <th className="p-4 text-left text-xs font-bold uppercase tracking-widest text-[#243B53] dark:text-blue-100 opacity-70">
              卖出股数
            </th>
            <th className="p-4 text-left text-xs font-bold uppercase tracking-widest text-[#243B53] dark:text-blue-100 opacity-70">
              卖出金额
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, index) => {
            // 根据网格类型设置行背景色 - 使用和谐的蓝色系配色
            const rowBgClass =
              row.gridType === "中网"
                ? "bg-cyan-50/20 dark:bg-cyan-900/8 border-l-2 border-cyan-200/30 dark:border-cyan-700/20"
                : row.gridType === "大网"
                ? "bg-slate-50/25 dark:bg-slate-800/12 border-l-2 border-slate-300/30 dark:border-slate-600/20"
                : "";

            // 判断是否是中网或大网的第一档位
            const isFirstPosition =
              (row.gridType === "中网" || row.gridType === "大网") &&
              firstPositionByType.get(row.gridType) === row.position;

            // 对于中网和大网的第一档位，如果 priceDropRate > 0，显示为负数
            const displayDropRate =
              isFirstPosition && row.priceDropRate > 0
                ? -row.priceDropRate
                : row.priceDropRate;

            return (
              <tr
                key={index}
                className={`border-b border-blue-50/30 dark:border-white/5 hover:bg-blue-50/50 dark:hover:bg-white/5 transition-all duration-300 ${rowBgClass}`}
              >
                <td className="p-4 font-medium text-[#243B53] dark:text-blue-100">
                  <span
                    className={`px-2 py-1 rounded text-xs font-bold ${
                      row.gridType === "小网"
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        : row.gridType === "中网"
                        ? "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300"
                        : "bg-slate-200 dark:bg-slate-700/40 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {row.gridType}
                  </span>
                </td>
                <td className="p-4 font-medium text-[#243B53] dark:text-blue-100">
                  {row.position.toFixed(2)}
                </td>
                <td className="p-4 text-[#243B53] dark:text-blue-100">
                  {row.buyPrice.toFixed(priceDecimals)}
                </td>
                <td
                  className={`p-4 font-medium ${
                    displayDropRate < 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-[#243B53] dark:text-blue-100"
                  }`}
                >
                  {displayDropRate === 0
                    ? "-"
                    : `${displayDropRate.toFixed(2)}%`}
                </td>
                <td className="p-4 text-[#243B53] dark:text-blue-100">
                  {row.buyAmount.toLocaleString()}
                </td>
                <td className="p-4 text-[#243B53] dark:text-blue-100">
                  {row.buyShares.toLocaleString()}
                </td>
                <td className="p-4 text-[#243B53] dark:text-blue-100">
                  {row.sellPrice.toFixed(priceDecimals)}
                </td>
                <td className="p-4 text-[#243B53] dark:text-blue-100">
                  {row.sellShares.toLocaleString()}
                </td>
                <td className="p-4 text-[#243B53] dark:text-blue-100">
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
