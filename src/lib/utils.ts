/**
 * 工具函数
 */

import type { FavoriteItem, HistoryItem } from "@/types/stock";

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
 * 规范化收藏项
 */
export function normalizeFavoriteEntry(entry: unknown): FavoriteItem | null {
  if (typeof entry === "string") {
    return { symbol: entry, name: null };
  }

  if (
    entry &&
    typeof entry === "object" &&
    "symbol" in entry &&
    typeof (entry as { symbol?: unknown }).symbol === "string"
  ) {
    const casted = entry as { symbol: string; name?: unknown };
    return {
      symbol: casted.symbol,
      name:
        typeof casted.name === "string" && casted.name.trim().length > 0
          ? casted.name
          : null,
    };
  }

  return null;
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

/**
 * 计算当前价相对最高价的跌幅百分比
 */
export function calculateDropFromHighest(
  currentPrice: number,
  highestPrice: number
): number {
  if (highestPrice <= 0) return 0;
  return ((highestPrice - currentPrice) / highestPrice) * 100;
}

/**
 * 计算当前价距离-80%点位的跌幅百分比
 * 返回值：正数表示还需要跌的百分比，负数表示已低于-80%点位的百分比
 */
export function calculateDropToTarget80(
  currentPrice: number,
  target80Price: number
): number {
  if (currentPrice <= 0 || target80Price <= 0) return 0;
  if (currentPrice >= target80Price) {
    // 如果当前价高于或等于-80%点位，计算还需要跌多少（相对于当前价）
    return ((currentPrice - target80Price) / currentPrice) * 100;
  } else {
    // 如果当前价已经低于-80%点位，计算已低于多少（相对于-80%点位）
    return -((target80Price - currentPrice) / target80Price) * 100;
  }
}

/**
 * 格式化时间差（距离最高价已过去X天/月/年）
 */
export function formatTimeSince(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days < 30) {
    return `${days} 天`;
  } else if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} 个月`;
  } else {
    const years = Math.floor(days / 365);
    const remainingMonths = Math.floor((days % 365) / 30);
    if (remainingMonths > 0) {
      return `${years} 年 ${remainingMonths} 个月`;
    }
    return `${years} 年`;
  }
}
