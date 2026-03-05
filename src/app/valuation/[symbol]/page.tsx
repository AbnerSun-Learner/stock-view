"use client";

import { ValuationChart } from "@/components/valuation/valuation-chart";
import type { ValuationPoint } from "@/components/valuation/valuation-chart";
import { ValuationNavbar } from "@/components/valuation/valuation-navbar";
import { ValuationPePanel } from "@/components/valuation/valuation-pe-panel";
import { INDEX_LIST, computePeStats } from "@/lib/valuation";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

interface HoldingItem {
  rank: number;
  name: string;
  code: string;
  weight: number;
  industry: string;
}

export default function ValuationDetailPage() {
  const params = useParams();
  const symbol = typeof params.symbol === "string" ? params.symbol : "";
  const indexName =
    INDEX_LIST.find((i) => i.symbol === symbol)?.name ?? `${symbol}指数`;

  const [chartData, setChartData] = useState<ValuationPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDropZones, setShowDropZones] = useState(false);
  const [holdings, setHoldings] = useState<HoldingItem[]>([]);
  const [holdingsLoading, setHoldingsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!symbol) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/valuation?symbol=${encodeURIComponent(symbol)}`
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "获取估值数据失败");
        setChartData([]);
        return;
      }
      setChartData(json.data || []);
    } catch {
      setError("网络或服务异常");
      setChartData([]);
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  const fetchHoldings = useCallback(async () => {
    if (!symbol) return;
    setHoldingsLoading(true);
    try {
      const res = await fetch(
        `/api/holdings?symbol=${encodeURIComponent(symbol)}`
      );
      const json = await res.json().catch(() => ({}));
      setHoldings(json.holdings || []);
    } catch {
      setHoldings([]);
    } finally {
      setHoldingsLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchData();
    fetchHoldings();
  }, [fetchData, fetchHoldings]);

  const peStats = useMemo(
    () =>
      chartData.length
        ? computePeStats(chartData.map((d) => d.value))
        : null,
    [chartData]
  );

  return (
    <div className="min-h-screen bg-[#F0F4F8] text-[#243B53]">
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-slate-200/20 rounded-full blur-[140px]" />
      </div>

      <ValuationNavbar />

      <div className="pt-20">
        <div className="max-w-[1400px] mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">
              {indexName} · 估值分析
            </h1>
          </div>

          {loading && (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700" />
            </div>
          )}

          {error && !loading && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-red-800 text-sm">
              {error}
            </div>
          )}

          {!loading && !error && chartData.length > 0 && peStats && (
            <>
              {/* 上半部分：左右布局 */}
              <section className="flex flex-col lg:flex-row gap-6 mb-10 lg:items-center">
                <aside className="w-full lg:w-[280px] shrink-0">
                  <ValuationPePanel
                    currentValue={peStats.current}
                    currentPercentile={peStats.currentPercentile}
                    percentile80={peStats.percentile80}
                    percentile50={peStats.percentile50}
                    percentile20={peStats.percentile20}
                    max={peStats.max}
                    average={peStats.average}
                    min={peStats.min}
                  />
                </aside>
                <main className="flex-1 min-w-0">
                  <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-6 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]">
                    <ValuationChart
                      data={chartData}
                      theme="light"
                      showDropZones={showDropZones}
                      hideStatsBar
                      chartHeaderRight={
                        <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer select-none">
                          <span>标注 70%/80% 下跌区域</span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={showDropZones}
                            onClick={() => setShowDropZones((v) => !v)}
                            className={`relative inline-flex h-6 w-10 shrink-0 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 ${
                              showDropZones
                                ? "bg-zinc-900 border-zinc-900"
                                : "bg-slate-200 border-slate-300"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${
                                showDropZones
                                  ? "translate-x-4"
                                  : "translate-x-0.5"
                              }`}
                            />
                          </button>
                        </label>
                      }
                    />
                  </div>
                </main>
              </section>

              {/* 下半部分：前十大持仓 */}
              <section className="rounded-2xl border border-slate-200/80 bg-white/95 overflow-hidden shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]">
                <div className="border-b border-slate-200 px-6 py-4">
                  <h2 className="text-lg font-semibold text-zinc-900">
                    该指数前十大持仓
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200">
                        <th className="text-left py-3 px-6 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                          序号
                        </th>
                        <th className="text-left py-3 px-6 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                          名称
                        </th>
                        <th className="text-left py-3 px-6 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                          代码
                        </th>
                        <th className="text-left py-3 px-6 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                          申万一级行业
                        </th>
                        <th className="text-right py-3 px-6 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                          占净值比例(%)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {holdingsLoading && (
                        <tr>
                          <td
                            colSpan={5}
                            className="py-10 text-center text-zinc-500 text-sm"
                          >
                            加载持仓数据中…
                          </td>
                        </tr>
                      )}
                      {!holdingsLoading && holdings.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="py-10 text-center text-zinc-500 text-sm"
                          >
                            暂无持仓数据
                          </td>
                        </tr>
                      )}
                      {!holdingsLoading &&
                        holdings.map((row) => (
                          <tr
                            key={row.rank}
                            className="hover:bg-slate-50/50 transition-colors"
                          >
                            <td className="py-3 px-6 text-sm font-mono text-zinc-700">
                              {row.rank}
                            </td>
                            <td className="py-3 px-6 text-sm font-medium text-zinc-900">
                              {row.name}
                            </td>
                            <td className="py-3 px-6 text-sm font-mono text-zinc-600">
                              {row.code}
                            </td>
                            <td className="py-3 px-6 text-sm text-zinc-700">
                              {row.industry || "—"}
                            </td>
                            <td className="py-3 px-6 text-sm font-mono text-right text-zinc-700">
                              {row.weight.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          {!loading && !error && chartData.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-8 text-center text-zinc-600">
              暂无估值数据
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
