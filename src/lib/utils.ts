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

/**
 * 获取北京时间
 */
function getBeijingTime(): Date {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));
}

/**
 * 判断是否在交易时间内
 * A股交易时间：9:30-11:30, 13:00-15:00（北京时间）
 */
export function isTradingHours(): boolean {
  const beijingTime = getBeijingTime();
  const day = beijingTime.getDay(); // 0=周日, 6=周六
  const hour = beijingTime.getHours();
  const minute = beijingTime.getMinutes();
  const timeInMinutes = hour * 60 + minute;

  // 周末不交易
  if (day === 0 || day === 6) {
    return false;
  }

  // 上午：9:30-11:30
  const morningStart = 9 * 60 + 30; // 9:30
  const morningEnd = 11 * 60 + 30; // 11:30
  // 下午：13:00-15:00
  const afternoonStart = 13 * 60; // 13:00
  const afternoonEnd = 15 * 60; // 15:00

  return (
    (timeInMinutes >= morningStart && timeInMinutes <= morningEnd) ||
    (timeInMinutes >= afternoonStart && timeInMinutes <= afternoonEnd)
  );
}

/**
 * 判断是否在收盘之后（15:00之后）
 */
export function isAfterMarketClose(): boolean {
  const beijingTime = getBeijingTime();
  const day = beijingTime.getDay();
  const hour = beijingTime.getHours();
  const minute = beijingTime.getMinutes();
  const timeInMinutes = hour * 60 + minute;

  // 周末不算收盘后
  if (day === 0 || day === 6) {
    return false;
  }

  // 15:00之后算收盘后
  return timeInMinutes >= 15 * 60;
}

/**
 * 获取应该使用的交易日日期字符串（YYYY-MM-DD格式）
 * - 如果在交易时间内，返回上一个交易日
 * - 如果在收盘后，返回当天交易日
 * - 如果是周末，返回上一个交易日
 */
export function getTargetTradeDate(): string {
  const beijingTime = getBeijingTime();
  const hour = beijingTime.getHours();
  const minute = beijingTime.getMinutes();
  const timeInMinutes = hour * 60 + minute;

  const targetDate = new Date(beijingTime);

  // 如果在交易时间内（9:30-11:30 或 13:00-15:00），使用上一个交易日
  const morningStart = 9 * 60 + 30;
  const morningEnd = 11 * 60 + 30;
  const afternoonStart = 13 * 60;
  const afternoonEnd = 15 * 60;

  const inTradingHours =
    (timeInMinutes >= morningStart && timeInMinutes <= morningEnd) ||
    (timeInMinutes >= afternoonStart && timeInMinutes <= afternoonEnd);

  if (inTradingHours) {
    // 在交易时间内，往前推一天
    targetDate.setDate(targetDate.getDate() - 1);
  }

  // 如果是周末，往前推到周五
  while (targetDate.getDay() === 0 || targetDate.getDay() === 6) {
    targetDate.setDate(targetDate.getDate() - 1);
  }

  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(targetDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${dayOfMonth}`;
}

/**
 * 判断日期字符串是否为今天（北京时间）
 */
export function isToday(dateStr: string): boolean {
  const beijingTime = getBeijingTime();
  const today = `${beijingTime.getFullYear()}-${String(
    beijingTime.getMonth() + 1
  ).padStart(2, "0")}-${String(beijingTime.getDate()).padStart(2, "0")}`;
  return dateStr === today;
}
