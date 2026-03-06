"use client"

import { ValuationChart } from "@/components/valuation/valuation-chart"
import type { ValuationPoint } from "@/components/valuation/valuation-chart"
import { ValuationDropPanel } from "@/components/valuation/valuation-drop-panel"
import { ValuationNavbar } from "@/components/valuation/valuation-navbar"
import { ValuationPePanel } from "@/components/valuation/valuation-pe-panel"
import { ValuationWeightChart } from "@/components/valuation/valuation-weight-chart"
import { useTheme } from "@/components/theme-provider"
import { INDEX_LIST, computePeStats } from "@/lib/valuation"
import { Segmented } from "antd"
import { useParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"

type ChartPeriod = "all" | "10y" | "5y"

function getPeriodCutoff(period: ChartPeriod): string | null {
  if (period === "all") return null
  const d = new Date()
  d.setFullYear(d.getFullYear() - (period === "10y" ? 10 : 5))
  return d.toISOString().slice(0, 10)
}

interface HoldingItem {
  rank: number
  name: string
  code: string
  weight: number
  industry: string
}

export default function ValuationDetailPage() {
  const { theme } = useTheme()
  const params = useParams()
  const symbol = typeof params.symbol === "string" ? params.symbol : ""
  const indexName =
    INDEX_LIST.find((i) => i.symbol === symbol)?.name ?? `${symbol}指数`

  const [chartData, setChartData] = useState<ValuationPoint[]>([])
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDropZones, setShowDropZones] = useState(false)
  const [showBands, setShowBands] = useState(false)
  const [holdings, setHoldings] = useState<HoldingItem[]>([])
  const [holdingsLoading, setHoldingsLoading] = useState(true)
  const [lastDate, setLastDate] = useState("")

  const fetchData = useCallback(async () => {
    if (!symbol) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/valuation?symbol=${encodeURIComponent(symbol)}`,
        { cache: "no-store" }
      )
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error || "获取估值数据失败")
        setChartData([])
        return
      }
      setChartData(json.data || [])
      if (json.latest?.date) setLastDate(json.latest.date)
    } catch {
      setError("网络或服务异常")
      setChartData([])
    } finally {
      setLoading(false)
    }
  }, [symbol])

  const fetchHoldings = useCallback(async () => {
    if (!symbol) return
    setHoldingsLoading(true)
    try {
      const res = await fetch(
        `/api/holdings?symbol=${encodeURIComponent(symbol)}`
      )
      const json = await res.json().catch(() => ({}))
      setHoldings(json.holdings || [])
    } catch {
      setHoldings([])
    } finally {
      setHoldingsLoading(false)
    }
  }, [symbol])

  useEffect(() => {
    fetchData()
    fetchHoldings()
  }, [fetchData, fetchHoldings])

  const periodCutoff = getPeriodCutoff(chartPeriod)
  const filteredChartData = useMemo(() => {
    if (!periodCutoff) return chartData
    return chartData.filter((d) => d.date >= periodCutoff)
  }, [chartData, periodCutoff])

  const peStats = useMemo(
    () =>
      filteredChartData.length
        ? computePeStats(filteredChartData.map((d) => d.value))
        : null,
    [filteredChartData]
  )

  const closeRange = useMemo(() => {
    const closes = filteredChartData
      .map((d) => d.close)
      .filter((c): c is number => typeof c === "number")
    if (!closes.length) return null
    return {
      current: closes[closes.length - 1],
      high: Math.max(...closes),
      min: Math.min(...closes),
    }
  }, [filteredChartData])

  const displayLastDate = lastDate

  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--foreground)]">
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-slate-200/10 dark:bg-slate-800/10 rounded-full blur-[100px]" />
      </div>

      <ValuationNavbar />

      <div className="pt-[4.5rem]">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[var(--foreground)]">
              {indexName}
            </h1>
            {displayLastDate && (
              <p className="text-sm text-[var(--muted-foreground)] mt-1">数据更新至 {displayLastDate}</p>
            )}
          </div>

          {loading && (
            <div className="flex h-72 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[color:var(--border-color)] border-t-[var(--brand)]" />
            </div>
          )}

          {error && !loading && (
            <div className="rounded-xl border border-[color:var(--loss)]/30 bg-red-50/80 dark:bg-red-950/20 px-6 py-4 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {!loading && !error && chartData.length > 0 && peStats && (
            <div className="space-y-6">
              {/* 第一行：图表在左，PE-TTM 与极限跌幅在右 */}
              <section className="flex flex-col lg:flex-row gap-6">
                <main className="flex-1 min-w-0 space-y-4">
                  <div className="rounded-xl border border-[color:var(--border-color)] bg-[var(--card-bg-elevated)] p-4 md:p-6">
                    <div className="mb-4">
                      <Segmented
                        value={chartPeriod}
                        onChange={(v) => setChartPeriod((v as ChartPeriod) || "all")}
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

                <aside className="w-full lg:w-[280px] shrink-0 space-y-6">
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

              {/* 指数权重（成分股 + 行业分布） */}
              {!holdingsLoading && holdings.length > 0 && (
                <ValuationWeightChart holdings={holdings} />
              )}

              <section className="rounded-xl border border-[color:var(--border-color)] bg-[var(--card-bg-elevated)] overflow-hidden">
                <div className="border-b border-[color:var(--border-color)] px-4 md:px-6 py-3.5">
                  <h2 className="text-xs font-semibold text-[var(--foreground)] uppercase tracking-wider">
                    前十大持仓明细
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 dark:bg-white/5 border-b border-[color:var(--border-color)]">
                        <th className="text-left py-2.5 px-4 md:px-6 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                          序号
                        </th>
                        <th className="text-left py-2.5 px-4 md:px-6 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                          名称
                        </th>
                        <th className="text-left py-2.5 px-4 md:px-6 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                          代码
                        </th>
                        <th className="text-left py-2.5 px-4 md:px-6 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                          申万一级行业
                        </th>
                        <th className="text-right py-2.5 px-4 md:px-6 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                          占净值比例(%)
                        </th>
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
                            className="hover:bg-[var(--hover-bg)] transition-colors"
                          >
                            <td className="py-2.5 px-4 md:px-6 text-sm font-mono text-[var(--foreground)]">
                              {row.rank}
                            </td>
                            <td className="py-2.5 px-4 md:px-6 text-sm font-medium text-[var(--foreground)]">
                              {row.name}
                            </td>
                            <td className="py-2.5 px-4 md:px-6 text-sm font-mono text-[var(--muted-foreground)]">
                              {row.code}
                            </td>
                            <td className="py-2.5 px-4 md:px-6 text-sm text-[var(--foreground)]">
                              {row.industry || "—"}
                            </td>
                            <td className="py-2.5 px-4 md:px-6 text-sm font-mono text-right text-[var(--foreground)]">
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
            <div className="rounded-xl border border-[color:var(--border-color)] bg-[var(--card-bg-elevated)] px-6 py-10 text-center text-sm text-[var(--muted-foreground)]">
              暂无估值数据
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
