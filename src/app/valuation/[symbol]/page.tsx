"use client";

import { useTheme } from "@/components/theme-provider";
import type { ValuationPoint } from "@/components/valuation/valuation-chart";
import { ValuationChart } from "@/components/valuation/valuation-chart";
import { ValuationDropPanel } from "@/components/valuation/valuation-drop-panel";
import { ValuationNavbar } from "@/components/valuation/valuation-navbar";
import { ValuationPePanel } from "@/components/valuation/valuation-pe-panel";
import { ValuationWeightChart } from "@/components/valuation/valuation-weight-chart";
import { INDEX_LIST, computePeStats } from "@/lib/valuation";
import { Segmented } from "antd";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type ChartPeriod = "all" | "10y" | "5y";

function getPeriodCutoff(period: ChartPeriod): string | null {
  if (period === "all") return null;
  const d = new Date();
  d.setFullYear(d.getFullYear() - (period === "10y" ? 10 : 5));
  return d.toISOString().slice(0, 10);
}

interface HoldingItem {
  rank: number;
  name: string;
  code: string;
  weight: number;
  industry: string;
}

export default function ValuationDetailPage() {
  const { theme } = useTheme();
  const params = useParams();
  const symbol = typeof params.symbol === "string" ? params.symbol : "";
  const indexName =
    INDEX_LIST.find((i) => i.symbol === symbol)?.name ?? `${symbol}指数`;

  const [chartData, setChartData] = useState<ValuationPoint[]>([]);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDropZones, setShowDropZones] = useState(false);
  const [showBands, setShowBands] = useState(false);
  const [holdings, setHoldings] = useState<HoldingItem[]>([]);
  const [holdingsLoading, setHoldingsLoading] = useState(true);
  const [lastDate, setLastDate] = useState("");

  const fetchData = useCallback(async () => {
    if (!symbol) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/valuation?symbol=${encodeURIComponent(symbol)}`,
        { cache: "no-store" }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "获取估值数据失败");
        setChartData([]);
        return;
      }
      setChartData(json.data || []);
      if (json.latest?.date) setLastDate(json.latest.date);
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

  const periodCutoff = getPeriodCutoff(chartPeriod);
  const filteredChartData = useMemo(() => {
    if (!periodCutoff) return chartData;
    return chartData.filter((d) => d.date >= periodCutoff);
  }, [chartData, periodCutoff]);

  const peStats = useMemo(
    () =>
      filteredChartData.length
        ? computePeStats(filteredChartData.map((d) => d.value))
        : null,
    [filteredChartData]
  );

  const closeRange = useMemo(() => {
    const closes = filteredChartData
      .map((d) => d.close)
      .filter((c): c is number => typeof c === "number");
    if (!closes.length) return null;
    return {
      current: closes[closes.length - 1],
      high: Math.max(...closes),
      min: Math.min(...closes),
    };
  }, [filteredChartData]);

  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--foreground)]">
      <ValuationNavbar />

      <div className="pt-20">
        <div className="max-w-7xl mx-auto px-8 md:px-16 py-16">
          {/* 页头 */}
          <div className="mb-10">
            <p className="text-xs font-medium tracking-[0.2em] uppercase text-[var(--muted-foreground)] mb-3">
              Index Valuation
            </p>
            <h1 className="text-3xl md:text-4xl font-light tracking-[-0.02em] text-[var(--foreground)] mb-2">
              {indexName}
            </h1>
            {lastDate && (
              <p
                className="text-sm text-[var(--muted-foreground)]"
                style={{ letterSpacing: "0.02em" }}
              >
                数据更新至 {lastDate}
              </p>
            )}
          </div>

          {loading && (
            <div className="flex h-72 items-center justify-center">
              <div
                className="h-6 w-6 border border-[color:var(--border-color)] border-t-[var(--foreground)] animate-spin"
                style={{ borderRadius: 0 }}
              />
            </div>
          )}

          {error && !loading && (
            <div
              className="border border-[color:var(--loss)]/30 px-6 py-4 text-sm text-[var(--loss)]"
              style={{ letterSpacing: "0.02em" }}
            >
              {error}
            </div>
          )}

          {!loading && !error && chartData.length > 0 && peStats && (
            <div className="space-y-8">
              {/* 图表区 */}
              <section className="flex flex-col lg:flex-row gap-8">
                <main className="flex-1 min-w-0">
                  <div className="border border-[color:var(--border-color)] p-6">
                    <div className="mb-6">
                      <Segmented
                        value={chartPeriod}
                        onChange={(v) =>
                          setChartPeriod((v as ChartPeriod) || "all")
                        }
                        options={[
                          { label: "全部", value: "all" },
                          { label: "近10年", value: "10y" },
                          { label: "近5年", value: "5y" },
                        ]}
                        className="valuation-segmented"
                      />
                    </div>
                    <ValuationChart
                      data={filteredChartData}
                      theme={theme}
                      showDropZones={showDropZones}
                      showBands={showBands}
                      hideStatsBar
                    />
                  </div>
                </main>

                <aside className="w-full lg:w-[260px] shrink-0 space-y-6">
                  <ValuationPePanel
                    currentValue={peStats.current}
                    currentPercentile={peStats.currentPercentile}
                    percentile80={peStats.percentile80}
                    percentile50={peStats.percentile50}
                    percentile20={peStats.percentile20}
                    max={peStats.max}
                    average={peStats.average}
                    min={peStats.min}
                    showBands={showBands}
                    onBandsChange={setShowBands}
                  />

                  {closeRange && (
                    <ValuationDropPanel
                      currentClose={closeRange.current}
                      highestClose={closeRange.high}
                      minClose={closeRange.min}
                      showDropZones={showDropZones}
                      onDropZonesChange={setShowDropZones}
                    />
                  )}
                </aside>
              </section>

              {/* 指数权重 */}
              {!holdingsLoading && holdings.length > 0 && (
                <ValuationWeightChart holdings={holdings} />
              )}

              {/* 持仓明细 */}
              <section className="border border-[color:var(--border-color)] overflow-hidden">
                <div className="border-b border-[color:var(--border-color)] px-6 py-4">
                  <h2 className="text-xs font-medium uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
                    前十大持仓明细
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-[#f5f5f5] dark:bg-[#1a1a1a] border-b border-[color:var(--border-color)]">
                        {[
                          "序号",
                          "名称",
                          "代码",
                          "申万一级行业",
                          "占净值比例(%)",
                        ].map((col, i) => (
                          <th
                            key={col}
                            className={`py-3 px-6 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--muted-foreground)] ${
                              i === 4 ? "text-right" : "text-left"
                            }`}
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[color:var(--border-color)]">
                      {holdingsLoading && (
                        <tr>
                          <td
                            colSpan={5}
                            className="py-10 text-center text-sm text-[var(--muted-foreground)]"
                          >
                            加载持仓数据中…
                          </td>
                        </tr>
                      )}
                      {!holdingsLoading && holdings.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="py-10 text-center text-sm text-[var(--muted-foreground)]"
                          >
                            暂无持仓数据
                          </td>
                        </tr>
                      )}
                      {!holdingsLoading &&
                        holdings.map((row) => (
                          <tr
                            key={row.rank}
                            className="hover:bg-[var(--hover-bg)] transition-colors duration-200"
                          >
                            <td className="py-3 px-6 text-sm font-mono text-[var(--muted-foreground)]">
                              {row.rank}
                            </td>
                            <td className="py-3 px-6 text-sm text-[var(--foreground)]">
                              {row.name}
                            </td>
                            <td className="py-3 px-6 text-sm font-mono text-[var(--muted-foreground)]">
                              {row.code}
                            </td>
                            <td className="py-3 px-6 text-sm text-[var(--foreground)]">
                              {row.industry || "—"}
                            </td>
                            <td className="py-3 px-6 text-sm font-mono text-right text-[var(--foreground)]">
                              {row.weight.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {!loading && !error && chartData.length === 0 && (
            <div className="border border-[color:var(--border-color)] px-6 py-10 text-center text-sm text-[var(--muted-foreground)]">
              暂无估值数据
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
