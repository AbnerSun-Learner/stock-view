/**
 * ETF Terminal 共享工具函数
 * 使用东方财富接口获取真实数据（通过API路由）
 */

import { isToday, isTradingHours } from "./utils";
import { INDEX_NAME_MAP } from "./stock-fetcher";

export function formatNum(val: number | string, dec = 2): string {
  const num = Number(val);
  if (Number.isNaN(num)) return "0.00";
  return num.toLocaleString(undefined, {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

export function getEffectiveTradingDate(): string {
  const now = new Date();
  const hour = now.getHours();
  const date = new Date(now);
  if (hour < 15) date.setDate(now.getDate() - 1);
  if (date.getDay() === 0) date.setDate(date.getDate() - 2);
  else if (date.getDay() === 6) date.setDate(date.getDate() - 1);
  return date.toISOString().split("T")[0];
}

/**
 * 通过代码获取价格（使用东方财富接口，通过API路由）
 */
export async function fetchPriceByCode(
  code: string
): Promise<{ current: number; date: string }> {
  try {
    const response = await fetch(
      `/api/stock?symbol=${encodeURIComponent(code)}&only_today_close=true`
    );
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = (await response.json()) as {
      close_price?: number;
      date?: string;
      error?: string;
    };
    if (
      data.error ||
      data.close_price === null ||
      data.close_price === undefined
    ) {
      return {
        current: 0,
        date: getEffectiveTradingDate(),
      };
    }
    return {
      current: data.close_price,
      date: data.date || getEffectiveTradingDate(),
    };
  } catch (error) {
    console.error("获取价格失败:", error);
    return {
      current: 0,
      date: getEffectiveTradingDate(),
    };
  }
}

/**
 * 获取指数数据（包括当前价格和历史最高价，通过API路由）
 */
export async function fetchIndexData(code: string): Promise<{
  name: string | null;
  current: number;
  peak: number;
  peakDate: string;
  tradingDate: string;
}> {
  try {
    const response = await fetch(
      `/api/stock?symbol=${encodeURIComponent(code)}`
    );
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = (await response.json()) as {
      name?: string;
      highest?: { price: number; time: number };
      current?: { price: number; time: number };
      candles?: Array<{ high: number; close: number; time: number }>;
      error?: string;
    };

    if (data.error || !data.current || !data.highest) {
      throw new Error(data.error || "未获取到数据");
    }

    // 当前价
    const current = data.current.price;

    // 数据交易日：
    // - 开盘期间：锁定到上一交易日（使用 getEffectiveTradingDate）
    // - 收盘后：同样可以使用 getEffectiveTradingDate（内部已按时间处理）
    const tradingDate = getEffectiveTradingDate();

    // 从历史数据中找到最高价和日期（最高价统计也遵守"开盘期间锁定到上一交易日"）
    // 注意：后端已经保证了在交易时间内 rawHighest 不会是今天的数据
    const inTradingHours = isTradingHours();
    const peak = data.highest?.price || 0;
    let peakDate = "";

    // 优先从 candles 中找到最高价对应的日期（用于更精确的匹配）
    if (data.candles && data.candles.length > 0) {
      for (const candle of data.candles) {
        const date = new Date(candle.time);
        const dateStr = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

        // 开盘期间：忽略"今天"的 K 线，只用历史数据计算最高价
        if (inTradingHours && isToday(dateStr)) {
          continue;
        }

        // 找到与 peak 匹配的最高价日期
        if (Math.abs(candle.high - peak) < 0.01) {
          peakDate = dateStr;
          break;
        }
      }
    }

    // 如果从 candles 中没有找到匹配的日期，使用 data.highest.time
    if (!peakDate && data.highest) {
      const highestDate = new Date(data.highest.time);
      peakDate = `${highestDate.getFullYear()}-${String(
        highestDate.getMonth() + 1
      ).padStart(2, "0")}-${String(highestDate.getDate()).padStart(2, "0")}`;
    }

    // 使用映射表替换名称（如果存在）
    const normalizedCode = code.trim().toUpperCase()
      .replace(".SZ", "")
      .replace(".SH", "")
      .replace(".BJ", "");
    const finalName = INDEX_NAME_MAP[normalizedCode] || data.name || null;

    return {
      name: finalName,
      current,
      peak,
      peakDate,
      tradingDate,
    };
  } catch (error) {
    console.error("获取指数数据失败:", error);
    // 返回默认值
    return {
      name: null,
      current: 0,
      peak: 0,
      peakDate: "",
      tradingDate: getEffectiveTradingDate(),
    };
  }
}
