import { NextRequest, NextResponse } from "next/server";

import { fetchEtfData, fetchEtfDataWithTodayClose } from "@/lib/stock-fetcher";
import { isAfterMarketClose, isToday, isTradingHours } from "@/lib/utils";

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

  // 保留所有数据，不进行过滤（让前端可以显示完整历史数据）
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
        date: row.date, // 临时保存日期用于判断
      };
    })
    .filter((candle): candle is Candle & { date: string } => Boolean(candle))
    .sort((a, b) => a.time - b.time);

  if (!candles.length) {
    return { candles: [], rawHighest: null, rawLatest: null };
  }

  // 最高价也要遵守“开盘期间锁定到上一交易日”的规则：
  // - 在交易时间内：忽略今天的 K 线，只在历史数据里找最高价
  // - 收盘后：包含今天在内的所有数据
  const inTradingHoursForHighest = isTradingHours();
  const rawHighest = candles.reduce<PricePoint | null>((acc, candle) => {
    if (inTradingHoursForHighest && isToday(candle.date)) {
      return acc;
    }
    if (!acc || candle.high > acc.price) {
      return { price: candle.high, time: candle.time };
    }
    return acc;
  }, null);

  // 根据交易日规则选择最新的收盘价
  // 如果在交易时间内（9:30-11:30 或 13:00-15:00），使用上一个交易日
  // 如果在收盘后（15:00之后），使用最后一条数据（可能是今天的）
  let rawLatest: PricePoint | null = null;
  if (candles.length > 0) {
    const lastCandle = candles[candles.length - 1];
    const isLastCandleToday = isToday(lastCandle.date);
    const inTradingHours = isTradingHours();
    const afterMarketClose = isAfterMarketClose();

    if (inTradingHours) {
      // 在交易时间内，需要找到上一个交易日的数据
      if (isLastCandleToday) {
        // 如果最后一条是今天的数据，使用上一个交易日
        if (candles.length > 1) {
          const prevCandle = candles[candles.length - 2];
          rawLatest = {
            price: prevCandle.close,
            time: prevCandle.time,
          };
        } else {
          // 如果只有今天的数据，没有前一天数据，仍然显示今天的（避免无数据）
          rawLatest = {
            price: lastCandle.close,
            time: lastCandle.time,
          };
        }
      } else {
        // 如果最后一条不是今天的数据，说明已经是上一个交易日了，直接使用
        rawLatest = {
          price: lastCandle.close,
          time: lastCandle.time,
        };
      }
    } else if (afterMarketClose) {
      // 在收盘后，使用最后一条数据（可能是今天的）
      rawLatest = {
        price: lastCandle.close,
        time: lastCandle.time,
      };
    } else {
      // 不在交易时间内，也不在收盘后（比如早上9:00之前，或者中午休市时间）
      // 这种情况下，如果最后一条是今天的数据，使用上一个交易日；否则使用最后一条
      if (isLastCandleToday && candles.length > 1) {
        const prevCandle = candles[candles.length - 2];
        rawLatest = {
          price: prevCandle.close,
          time: prevCandle.time,
        };
      } else {
        rawLatest = {
          price: lastCandle.close,
          time: lastCandle.time,
        };
      }
    }
  }

  // 移除临时日期字段
  const cleanCandles = candles.map(({ date, ...candle }) => candle);

  return { candles: cleanCandles, rawHighest, rawLatest };
}

async function fetchEtfPayload(tsCode: string) {
  const output = await fetchEtfData(tsCode);
  // 如果返回的是当天收盘价格式，不应该在这里处理
  if (output.close_price !== undefined) {
    throw new Error("获取历史数据失败，返回了收盘价格式");
  }
  const series = buildEtfSeries(output.daily || []);
  return { 
    name: output.name, 
    series,
    ath_point: output.ath_point,
    ath_date: output.ath_date,
  };
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
    const { name, series, ath_point, ath_date } = await fetchEtfPayload(code);
    const { candles, rawHighest, rawLatest } = series;

    if (!candles.length) {
      return NextResponse.json(
        { error: "该ETF暂无有效日 K 数据" },
        { status: 404 }
      );
    }

    // 优先使用 Python API 返回的历史最高点（从指数成立以来）
    // 如果 Python API 没有返回，则从 candles 中计算
    let fallbackHighest: PricePoint | null = null;
    if (ath_point !== undefined && ath_point !== null && ath_date) {
      // 使用 Python API 返回的历史最高点
      const athTimestamp = tradeDateToTimestamp(ath_date);
      if (athTimestamp !== null) {
        fallbackHighest = { price: ath_point, time: athTimestamp };
      }
    }
    
    // 如果 Python API 没有返回历史最高点，则从 candles 中计算
    if (!fallbackHighest) {
      fallbackHighest =
        rawHighest ??
        candles.reduce<PricePoint | null>((acc, candle) => {
          if (!acc || candle.high > acc.price) {
            return { price: candle.high, time: candle.time };
          }
          return acc;
        }, null);
    }

    // 使用 buildEtfSeries 中已经计算好的 rawLatest
    const latestPoint = rawLatest;

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
    console.error("获取ETF数据失败:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "获取ETF数据失败，请稍后重试", details: errorMessage },
      { status: 500 }
    );
  }
}
