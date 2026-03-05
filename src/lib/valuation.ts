/**
 * 指数估值相关常量与工具
 */

export interface IndexItem {
  symbol: string;
  name: string;
  /** lg = 乐咕乐股指数PE, etf = ETF行情 */
  source: "lg" | "etf";
  /** 乐咕乐股接口用的名称 */
  lgName?: string;
}

export const INDEX_LIST: IndexItem[] = [
  { symbol: "000300", name: "沪深300指数", source: "lg", lgName: "沪深300" },
]

/** 乐咕乐股接口使用的名称 */
export const SYMBOL_TO_LG_NAME: Record<string, string> = {
  "000300": "沪深300",
  "000016": "上证50",
  "000905": "中证500",
  "399006": "创业板50",
  "000852": "中证1000",
  "000100": "中证100",
  "000906": "中证800",
}

export function formatDataUpdateLabel(lastDataDate: string | null): string {
  if (lastDataDate) return lastDataDate
  const now = new Date()
  const hour = now.getHours()
  const minute = now.getMinutes()
  const closeTime = 15 * 60 + 0
  const currentMinutes = hour * 60 + minute
  const isAfterClose = currentMinutes >= closeTime
  const d = new Date(now)
  if (!isAfterClose) d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

export function computePeStats(values: number[]) {
  if (!values.length)
    return {
      current: 0,
      currentPercentile: 0,
      percentile80: 0,
      percentile50: 0,
      percentile20: 0,
      max: 0,
      min: 0,
      average: 0,
    }
  const sorted = [...values].sort((a, b) => a - b)
  const current = values[values.length - 1]
  const rank = sorted.filter((v) => v <= current).length
  const currentPercentile = Math.round((rank / values.length) * 10000) / 100
  const idx = (p: number) => Math.min(Math.floor(p * (sorted.length - 1)), sorted.length - 1)
  return {
    current,
    currentPercentile,
    percentile80: sorted[idx(0.8)],
    percentile50: sorted[idx(0.5)],
    percentile20: sorted[idx(0.2)],
    max: sorted[sorted.length - 1],
    min: sorted[0],
    average: values.reduce((a, b) => a + b, 0) / values.length,
  }
}

export function matchIndexFuzzy(
  keyword: string,
  name: string,
  symbol: string
): boolean {
  if (!keyword.trim()) return true
  const k = keyword.trim().toLowerCase()
  return name.toLowerCase().includes(k) || symbol.toLowerCase().includes(k)
}
