"use client";

import { HelpCircle } from "lucide-react";
import type { StressTest } from "@/types/grid";

interface StatsCardsProps {
  stressTest: StressTest;
}

export function StatsCards({ stressTest }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      <div className="p-5 bg-blue-50/50 dark:bg-blue-900/20 rounded-2xl border border-blue-100/50 dark:border-white/5 shadow-lg shadow-blue-900/5 hover:shadow-xl transition-all duration-300">
        <div className="text-[10px] font-bold text-blue-700 dark:text-blue-300 mb-2 uppercase tracking-widest opacity-70">
          总买入金额
        </div>
        <div className="text-2xl font-bold text-[#243B53] dark:text-blue-100">
          {stressTest.totalBuyAmount.toLocaleString()}
        </div>
      </div>
      <div className="p-5 bg-purple-50/50 dark:bg-purple-900/20 rounded-2xl border border-purple-100/50 dark:border-white/5 shadow-lg shadow-purple-900/5 hover:shadow-xl transition-all duration-300">
        <div className="text-[10px] font-bold text-purple-700 dark:text-purple-300 mb-2 uppercase tracking-widest opacity-70">
          总卖出金额
        </div>
        <div className="text-2xl font-bold text-[#243B53] dark:text-purple-100">
          {stressTest.totalSellAmount.toLocaleString()}
        </div>
      </div>
      <div className="p-5 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100/50 dark:border-white/5 shadow-lg shadow-indigo-900/5 hover:shadow-xl transition-all duration-300">
        <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 mb-2 uppercase tracking-widest opacity-70">
          <span>剩余股数</span>
          <div className="group relative">
            <HelpCircle className="w-3 h-3 cursor-help text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200 transition-colors" />
            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-[99999] w-48 p-2 text-xs rounded-lg bg-slate-900 text-slate-100 shadow-lg whitespace-normal pointer-events-none">
              剩余股数 = 总买入股数 - 总卖出股数
            </div>
          </div>
        </div>
        <div className="text-2xl font-bold text-[#243B53] dark:text-indigo-100">
          {stressTest.remainingShares.toLocaleString()}
        </div>
      </div>
      <div className="p-5 bg-emerald-50/50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100/50 dark:border-white/5 shadow-lg shadow-emerald-900/5 hover:shadow-xl transition-all duration-300">
        <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 mb-2 uppercase tracking-widest opacity-70">
          <span>预期利润</span>
          <div className="group relative">
            <HelpCircle className="w-3 h-3 cursor-help text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-200 transition-colors" />
            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-[99999] w-56 p-2 text-xs rounded-lg bg-slate-900 text-slate-100 shadow-lg whitespace-normal pointer-events-none">
              利润 = 卖出金额 - 买入金额 + 剩余股数 × 基准价
            </div>
          </div>
        </div>
        <div
          className={`text-2xl font-bold ${
            stressTest.profit > 0
              ? "text-emerald-600 dark:text-emerald-400"
              : stressTest.profit < 0
              ? "text-red-600 dark:text-red-400"
              : "text-[#243B53] dark:text-slate-400"
          }`}
        >
          {stressTest.profit > 0 ? "+" : ""}
          {stressTest.profit.toLocaleString()}
        </div>
      </div>
      <div className="p-5 bg-amber-50/50 dark:bg-amber-900/20 rounded-2xl border border-amber-100/50 dark:border-white/5 shadow-lg shadow-amber-900/5 hover:shadow-xl transition-all duration-300">
        <div className="flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 mb-2 uppercase tracking-widest opacity-70">
          <span>收益率</span>
          <div className="group relative">
            <HelpCircle className="w-3 h-3 cursor-help text-amber-400 hover:text-amber-600 dark:hover:text-amber-200 transition-colors" />
            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-[99999] w-48 p-2 text-xs rounded-lg bg-slate-900 text-slate-100 shadow-lg whitespace-normal pointer-events-none">
              利润 / 买入金额 × 100
            </div>
          </div>
        </div>
        <div
          className={`text-2xl font-bold ${
            stressTest.profitRate > 0
              ? "text-emerald-600 dark:text-emerald-400"
              : stressTest.profitRate < 0
              ? "text-red-600 dark:text-red-400"
              : "text-[#243B53] dark:text-slate-400"
          }`}
        >
          {stressTest.profitRate > 0 ? "+" : ""}
          {stressTest.profitRate}%
        </div>
      </div>
    </div>
  );
}
