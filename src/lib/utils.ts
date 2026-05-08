/**
 * 工具函数
 */

import type { HistoryItem } from "@/types/stock";
export {
  getShanghaiDate,
  getTargetTradeDate,
  isAfterMarketClose,
  isToday,
  isTradingHours,
} from "@/lib/market-calendar";

/**
 * 格式化ETF标签
 */
export function formatEtfLabel(symbol: string, name?: string | null): string {
  return name ? `${symbol}（${name}）` : symbol;
}

/**
 * 格式化日期
 */
export function formatDate(ts: number): string {
  const d = new Date(ts);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 规范化历史记录项
 */
export function normalizeHistoryEntry(entry: unknown): HistoryItem | null {
  if (
    entry &&
    typeof entry === "object" &&
    "symbol" in entry &&
    typeof (entry as { symbol?: unknown }).symbol === "string"
  ) {
    const casted = entry as {
      symbol: string;
      name?: unknown;
      time?: unknown;
    };
    const timeValue =
      typeof casted.time === "number" && Number.isFinite(casted.time)
        ? casted.time
        : Date.now();

    return {
      symbol: casted.symbol,
      name:
        typeof casted.name === "string" && casted.name.trim().length > 0
          ? casted.name
          : null,
      time: timeValue,
    };
  }

  return null;
}
