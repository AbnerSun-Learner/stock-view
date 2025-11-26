import { NextRequest, NextResponse } from "next/server";

import { fetchEtfData, fetchEtfDataWithTodayClose } from "@/lib/stock-fetcher";

export const runtime = "nodejs";

// 简单缓存，避免同一只ETF频繁请求第三方接口（进程级，部署后可视情况替换为更高级缓存）
const memoryCache = new Map<string, { timestamp: number; data: unknown }>();

const CACHE_TTL_MS = 1 * 60 * 1000; // 1 分钟（实时数据需要更频繁更新）

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type PricePoint = {
  price: number;
  time: number;
};

type EtfSeries = {
  candles: Candle[];
  rawHighest: PricePoint | null;
  rawLatest: PricePoint | null;
};

type FetcherDailyRow = {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
};

function tradeDateToTimestamp(tradeDate: string): number | null {
  let normalized: string | null = null;
  if (/^\d{8}$/.test(tradeDate)) {
    const year = tradeDate.slice(0, 4);
    const month = tradeDate.slice(4, 6);
    const day = tradeDate.slice(6, 8);
    normalized = `${year}-${month}-${day}`;
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(tradeDate)) {
    normalized = tradeDate;
  }

  if (!normalized) {
    return null;
  }

  const date = new Date(`${normalized}T15:00:00+08:00`);
  const time = date.getTime();
  return Number.isNaN(time) ? null : time;
}

function isTradingHours(): boolean {
  // A股交易时间：9:30-11:30, 13:00-15:00（北京时间）
  const now = new Date();
  const beijingTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Shanghai" })
  );
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

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed.length) {
      return null;
    }
    const num = Number(trimmed);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

function buildEtfSeries(rows: FetcherDailyRow[]): EtfSeries {
  if (!rows.length) {
    return { candles: [], rawHighest: null, rawLatest: null };
  }

  const candles = rows
    .map((row) => {
      const time = tradeDateToTimestamp(row.date);
      if (time === null) {
        return null;
      }

      const open = row.open;
      const high = row.high;
      const low = row.low;
      const close = row.close;

      if (open === null || high === null || low === null || close === null) {
        return null;
      }

      const volume =
        typeof row.volume === "number" && Number.isFinite(row.volume)
          ? row.volume
          : 0;

      return {
        time,
        open,
        high,
        low,
        close,
        volume,
      };
    })
    .filter((candle): candle is Candle => Boolean(candle))
    .sort((a, b) => a.time - b.time);

  if (!candles.length) {
    return { candles: [], rawHighest: null, rawLatest: null };
  }

  const rawHighest = candles.reduce<PricePoint | null>((acc, candle) => {
    if (!acc || candle.high > acc.price) {
      return { price: candle.high, time: candle.time };
    }
    return acc;
  }, null);

  const rawLatest = {
    price: candles[candles.length - 1].close,
    time: candles[candles.length - 1].time,
  };

  return { candles, rawHighest, rawLatest };
}

async function fetchEtfPayload(tsCode: string) {
  const output = await fetchEtfData(tsCode);
  // 如果返回的是当天收盘价格式，不应该在这里处理
  if (output.close_price !== undefined) {
    throw new Error("获取历史数据失败，返回了收盘价格式");
  }
  const series = buildEtfSeries(output.daily || []);
  return { name: output.name, series };
}

export async function DELETE() {
  // 清除所有缓存
  memoryCache.clear();
  return NextResponse.json({ success: true, message: "缓存已清除" });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol");
  const code = symbol || "";
  const onlyTodayClose = searchParams.get("only_today_close") === "true";

  const cacheKey = `${code}_${onlyTodayClose}`;
  const cached = memoryCache.get(cacheKey);
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  try {
    // 如果只需要当天收盘价（用于ETF）
    if (onlyTodayClose) {
      const output = await fetchEtfDataWithTodayClose(code);

      if (output.close_price === null || output.close_price === undefined) {
        return NextResponse.json(
          { error: "无法获取该ETF的当天收盘价格" },
          { status: 404 }
        );
      }

      const payload = {
        symbol: code,
        name: output.name,
        close_price:
          output.close_price != null
            ? parseFloat(output.close_price.toFixed(3))
            : null,
        date: output.date,
      };

      memoryCache.set(cacheKey, { timestamp: now, data: payload });
      return NextResponse.json(payload);
    }

    // 否则获取完整的历史数据
    const { name, series } = await fetchEtfPayload(code);
    const { candles, rawHighest, rawLatest } = series;

    if (!candles.length) {
      return NextResponse.json(
        { error: "该ETF暂无有效日 K 数据" },
        { status: 404 }
      );
    }

    const fallbackHighest =
      rawHighest ??
      candles.reduce<PricePoint | null>((acc, candle) => {
        if (!acc || candle.high > acc.price) {
          return { price: candle.high, time: candle.time };
        }
        return acc;
      }, null);

    // 根据交易时间决定显示当天还是上一个交易日的收盘价
    let latestPoint: PricePoint | null = null;
    if (candles.length > 0) {
      const lastCandle = candles[candles.length - 1];
      // 获取北京时间的今天日期字符串
      const nowBeijing = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Shanghai" })
      );
      const todayDateStr = `${nowBeijing.getFullYear()}-${String(
        nowBeijing.getMonth() + 1
      ).padStart(2, "0")}-${String(nowBeijing.getDate()).padStart(2, "0")}`;

      // lastCandle.time 已经是北京时间（从 tradeDateToTimestamp 生成）
      const lastCandleDate = new Date(lastCandle.time);
      const lastCandleDateStr = `${lastCandleDate.getFullYear()}-${String(
        lastCandleDate.getMonth() + 1
      ).padStart(2, "0")}-${String(lastCandleDate.getDate()).padStart(2, "0")}`;

      const isLastCandleToday = lastCandleDateStr === todayDateStr;
      const inTradingHours = isTradingHours();

      if (isLastCandleToday && inTradingHours) {
        // 如果最后一条数据是今天，且在交易时间内，显示上一个交易日的收盘价
        if (candles.length > 1) {
          const prevCandle = candles[candles.length - 2];
          latestPoint = {
            price: prevCandle.close,
            time: prevCandle.time,
          };
        } else {
          // 如果只有一条数据（今天），且没有前一天数据，仍然显示今天的
          latestPoint = {
            price: lastCandle.close,
            time: lastCandle.time,
          };
        }
      } else {
        // 不在交易时间内，或者最后一条数据不是今天，显示最后一条数据的收盘价
        latestPoint = {
          price: lastCandle.close,
          time: lastCandle.time,
        };
      }
    }

    // 如果没有 rawLatest，使用上面计算的 latestPoint
    if (!latestPoint) {
      latestPoint = rawLatest ?? null;
    }

    if (!fallbackHighest || !latestPoint) {
      return NextResponse.json(
        { error: "该ETF暂无有效收盘价数据" },
        { status: 404 }
      );
    }

    const target80Price = fallbackHighest.price * 0.2;
    // const denominator = fallbackHighest.price * 0.8;
    const expectedDropRatio =
      (latestPoint.price - target80Price) / latestPoint.price;

    const payload = {
      symbol: code,
      name,
      highest: fallbackHighest,
      target80: {
        price: target80Price,
      },
      current: {
        price: latestPoint.price,
        time: latestPoint.time,
      },
      expectedDropRatio,
      candles,
    };

    memoryCache.set(cacheKey, { timestamp: now, data: payload });

    return NextResponse.json(payload);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "获取ETF数据失败，请稍后重试" },
      { status: 500 }
    );
  }
}
