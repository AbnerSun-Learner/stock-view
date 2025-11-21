import { NextRequest, NextResponse } from "next/server";

// 简单缓存，避免同一只股票频繁请求第三方接口（进程级，部署后可视情况替换为更高级缓存）
const memoryCache = new Map<string, { timestamp: number; data: unknown }>();

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 分钟
const DEFAULT_START_DATE = "19901219"; // 上证开市
const FETCH_LIMIT = 4000;

type TushareResponse = {
  code: number;
  msg: string;
  data: {
    fields: string[];
    items: Array<Array<string | number | null>>;
  } | null;
};

const TUSHARE_API_URL = "https://api.tushare.pro";

const REQUIRED_FIELDS = [
  "trade_date",
  "open",
  "high",
  "low",
  "close",
  "vol",
] as const;

const STOCK_BASIC_FIELDS = ["ts_code", "name"] as const;
const ADJ_FACTOR_FIELDS = ["trade_date", "adj_factor"] as const;
const STK_WEEK_MONTH_FIELDS = ["trade_date", "close_qfq"] as const;

type TushareTable = {
  fields: string[];
  items: Array<Array<string | number | null>>;
};

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

type StockSeries = {
  candles: Candle[];
  rawHighest: PricePoint | null;
  rawLatest: PricePoint | null;
};

const stockNameCache = new Map<string, string>();

function normalizeToTsCode(symbol: string): string | null {
  const upper = symbol.toUpperCase();
  if (/^\d{6}\.(SZ|SH)$/.test(upper)) {
    return upper;
  }
  if (/^\d{6}$/.test(upper)) {
    if (upper.startsWith("6")) {
      return `${upper}.SH`;
    }
    if (upper.startsWith("0") || upper.startsWith("3")) {
      return `${upper}.SZ`;
    }
  }
  return null;
}

function tradeDateToTimestamp(tradeDate: string): number | null {
  if (!/^\d{8}$/.test(tradeDate)) return null;
  const year = tradeDate.slice(0, 4);
  const month = tradeDate.slice(4, 6);
  const day = tradeDate.slice(6, 8);
  const date = new Date(`${year}-${month}-${day}T15:00:00+08:00`);
  const time = date.getTime();
  return Number.isNaN(time) ? null : time;
}

function toNumber(value: string | number | null): number | null {
  if (value === null || value === undefined) return null;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

async function callTushare({
  apiName,
  token,
  params,
  fields,
}: {
  apiName: string;
  token: string;
  params: Record<string, unknown>;
  fields?: string;
}) {
  const payload: Record<string, unknown> = {
    api_name: apiName,
    token,
    params,
  };

  if (fields) {
    payload.fields = fields;
  }

  const resp = await fetch(TUSHARE_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!resp.ok) {
    throw new Error(`TuShare 接口 ${apiName} 返回 HTTP ${resp.status}`);
  }

  const json = (await resp.json()) as TushareResponse;
  if (json.code !== 0) {
    throw new Error(json.msg || `TuShare 接口 ${apiName} 返回错误`);
  }

  return (
    json.data ?? {
      fields: [],
      items: [],
    }
  );
}

function toSinaSymbol(tsCode: string): string | null {
  const match = tsCode.match(/^(\d{6})\.(SH|SZ)$/i);
  if (!match) {
    return null;
  }
  const [, digits, market] = match;
  const prefix = market.toUpperCase() === "SH" ? "sh" : "sz";
  return `${prefix}${digits}`;
}

async function fetchNameFromSina(tsCode: string): Promise<string | null> {
  const sinaSymbol = toSinaSymbol(tsCode);
  if (!sinaSymbol) {
    return null;
  }

  const resp = await fetch(`https://hq.sinajs.cn/list=${sinaSymbol}`, {
    headers: {
      Referer: "https://finance.sina.com.cn",
    },
    cache: "no-store",
  });

  if (!resp.ok) {
    return null;
  }

  const text = await resp.text();
  const match = text.match(/="([^",]+),/);
  if (!match) {
    return null;
  }

  const name = match[1].trim();
  return name.length ? name : null;
}

async function fetchStockName(tsCode: string, token: string) {
  const cached = stockNameCache.get(tsCode);
  if (cached) {
    return cached;
  }

  try {
    const data = await callTushare({
      apiName: "stock_basic",
      token,
      params: { ts_code: tsCode },
      fields: STOCK_BASIC_FIELDS.join(","),
    });

    if (data.items.length) {
      const nameIndex = data.fields.indexOf("name");
      if (nameIndex !== -1) {
        const firstRow = data.items[0];
        const rawName = firstRow?.[nameIndex];
        const normalized =
          typeof rawName === "string" && rawName.trim().length
            ? rawName.trim()
            : null;
        if (normalized) {
          stockNameCache.set(tsCode, normalized);
          return normalized;
        }
      }
    }
  } catch {
    // TuShare 查询失败时继续尝试新浪数据源
  }

  const fallbackName = await fetchNameFromSina(tsCode);
  if (fallbackName) {
    stockNameCache.set(tsCode, fallbackName);
    return fallbackName;
  }

  return null;
}

async function fetchPagedDataset({
  apiName,
  token,
  params,
  fields,
}: {
  apiName: string;
  token: string;
  params: Record<string, unknown>;
  fields?: readonly string[];
}): Promise<TushareTable> {
  let offset = 0;
  let hasMore = true;
  const aggregated: Array<Array<string | number | null>> = [];
  let fieldSnapshot: string[] | null = null;

  while (hasMore) {
    const data = await callTushare({
      apiName,
      token,
      params: {
        ...params,
        limit: FETCH_LIMIT,
        offset,
      },
      fields: fields?.join(","),
    });

    if (!fieldSnapshot && data.fields.length) {
      fieldSnapshot = data.fields;
    }

    if (!data.items.length) {
      break;
    }

    aggregated.push(...data.items);

    if (data.items.length < FETCH_LIMIT) {
      hasMore = false;
    } else {
      offset += data.items.length;
      if (offset > 200000) {
        throw new Error("日 K 数据量异常，已停止拉取以避免死循环");
      }
    }
  }

  return {
    fields: fieldSnapshot ?? [],
    items: aggregated,
  };
}

async function fetchDailyRaw(tsCode: string, token: string) {
  return fetchPagedDataset({
    apiName: "daily",
    token,
    params: {
      ts_code: tsCode,
      start_date: DEFAULT_START_DATE,
    },
    fields: REQUIRED_FIELDS,
  });
}

async function fetchAdjFactorRaw(tsCode: string, token: string) {
  return fetchPagedDataset({
    apiName: "adj_factor",
    token,
    params: {
      ts_code: tsCode,
      start_date: DEFAULT_START_DATE,
    },
    fields: ADJ_FACTOR_FIELDS,
  });
}

async function fetchHighestAdjClose(
  tsCode: string,
  token: string
): Promise<PricePoint | null> {
  const data = await fetchPagedDataset({
    apiName: "stk_week_month_adj",
    token,
    params: {
      ts_code: tsCode,
      freq: "week",
    },
    fields: STK_WEEK_MONTH_FIELDS,
  });

  if (!data.items.length) {
    return null;
  }

  const index = createFieldIndex(data.fields, STK_WEEK_MONTH_FIELDS);
  let highest: PricePoint | null = null;

  for (const row of data.items) {
    const close = toNumber(row[index.close_qfq]);
    const tradeDate = row[index.trade_date];
    if (close === null || typeof tradeDate !== "string") {
      continue;
    }
    const time = tradeDateToTimestamp(tradeDate);
    if (time === null) {
      continue;
    }
    if (!highest || close > highest.price) {
      highest = { price: close, time };
    }
  }

  return highest;
}

function createFieldIndex<T extends readonly string[]>(
  fields: string[],
  required: T
): Record<T[number], number> {
  const result: Partial<Record<T[number], number>> = {};
  for (const field of required) {
    const idx = fields.indexOf(field);
    if (idx === -1) {
      throw new Error(`返回数据缺少字段 ${field}`);
    }
    result[field as T[number]] = idx;
  }
  return result as Record<T[number], number>;
}

function buildStockSeries(
  dailyData: TushareTable,
  adjFactorData: TushareTable
): StockSeries {
  if (!dailyData.items.length) {
    return { candles: [], rawHighest: null, rawLatest: null };
  }

  const dailyIndex = createFieldIndex(dailyData.fields, REQUIRED_FIELDS);
  const adjIndex = createFieldIndex(adjFactorData.fields, ADJ_FACTOR_FIELDS);

  const adjFactorMap = new Map<string, number>();
  let latestAdjFactorValue: number | null = null;
  let latestAdjFactorTradeDate: string | null = null;

  for (const row of adjFactorData.items) {
    const tradeDate = row[adjIndex.trade_date];
    const adjFactor = toNumber(row[adjIndex.adj_factor]);
    if (typeof tradeDate === "string" && adjFactor !== null) {
      adjFactorMap.set(tradeDate, adjFactor);
      if (!latestAdjFactorTradeDate || tradeDate > latestAdjFactorTradeDate) {
        latestAdjFactorTradeDate = tradeDate;
        latestAdjFactorValue = adjFactor;
      }
    }
  }

  if (!adjFactorMap.size || latestAdjFactorValue === null) {
    throw new Error("未获取到有效复权因子数据");
  }

  let latestDailyTradeDate: string | null = null;
  let rawLatest: PricePoint | null = null;
  let rawLatestTradeDate: string | null = null;

  for (const row of dailyData.items) {
    const tradeDate = row[dailyIndex.trade_date];
    if (typeof tradeDate !== "string") {
      continue;
    }

    if (!latestDailyTradeDate || tradeDate > latestDailyTradeDate) {
      latestDailyTradeDate = tradeDate;
    }

    const closeValue = toNumber(row[dailyIndex.close]);
    const time = tradeDateToTimestamp(tradeDate);
    if (closeValue === null || time === null) {
      continue;
    }

    if (!rawLatestTradeDate || tradeDate > rawLatestTradeDate) {
      rawLatestTradeDate = tradeDate;
      rawLatest = { price: closeValue, time };
    }
  }

  const baselineTradeDate =
    (latestDailyTradeDate && adjFactorMap.get(latestDailyTradeDate)
      ? latestDailyTradeDate
      : latestAdjFactorTradeDate) ?? null;
  const baselineFactor =
    (baselineTradeDate && adjFactorMap.get(baselineTradeDate)) ??
    latestAdjFactorValue;

  if (baselineFactor === null) {
    throw new Error("无法确定最近交易日的复权因子");
  }
  const ensuredBaselineFactor = baselineFactor as number;

  const candles = dailyData.items
    .map((row) => {
      const tradeDate = row[dailyIndex.trade_date];
      if (typeof tradeDate !== "string") {
        return null;
      }
      const factor = adjFactorMap.get(tradeDate);
      if (factor === undefined || factor === null) {
        return null;
      }
      const ratio = factor / ensuredBaselineFactor;
      if (!Number.isFinite(ratio) || ratio <= 0) {
        return null;
      }

      const open = toNumber(row[dailyIndex.open]);
      const high = toNumber(row[dailyIndex.high]);
      const low = toNumber(row[dailyIndex.low]);
      const close = toNumber(row[dailyIndex.close]);
      const volume = toNumber(row[dailyIndex.vol]);

      if (
        open === null ||
        high === null ||
        low === null ||
        close === null ||
        volume === null
      ) {
        return null;
      }

      const time = tradeDateToTimestamp(tradeDate);
      if (time === null) return null;

      const adjust = (value: number) => value * ratio;

      return {
        time,
        open: adjust(open),
        high: adjust(high),
        low: adjust(low),
        close: adjust(close),
        volume,
      };
    })
    .filter((candle): candle is Candle => Boolean(candle))
    .reverse();

  const adjustedHighest = candles.reduce<PricePoint | null>((acc, candle) => {
    if (!acc || candle.close > acc.price) {
      return { price: candle.close, time: candle.time };
    }
    return acc;
  }, null);

  return { candles, rawHighest: adjustedHighest, rawLatest };
}

async function fetchStockSeries(tsCode: string, token: string) {
  const [dailyData, adjFactorData] = await Promise.all([
    fetchDailyRaw(tsCode, token),
    fetchAdjFactorRaw(tsCode, token),
  ]);
  return buildStockSeries(dailyData, adjFactorData);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol")?.trim();

  if (!symbol) {
    return NextResponse.json(
      { error: "缺少股票代码参数 symbol" },
      { status: 400 }
    );
  }

  const tsCode = normalizeToTsCode(symbol);
  if (!tsCode) {
    return NextResponse.json(
      {
        error: "仅支持 6 位 A 股代码（如 000001.SZ 或 600519.SH），请检查输入",
      },
      { status: 400 }
    );
  }

  const tushareToken = process.env.TUSHARE_TOKEN?.trim();
  if (!tushareToken) {
    return NextResponse.json(
      { error: "服务器未配置 TuShare Token，请联系管理员" },
      { status: 500 }
    );
  }

  // 简单内存缓存
  const cacheKey = tsCode;
  const cached = memoryCache.get(cacheKey);
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  try {
    const [basicInfo, series, highestFromWeekMonth] = await Promise.all([
      fetchStockName(tsCode, tushareToken).catch(() => null),
      fetchStockSeries(tsCode, tushareToken),
      fetchHighestAdjClose(tsCode, tushareToken).catch(() => null),
    ]);

    console.log("111-222", highestFromWeekMonth);

    const { candles, rawHighest, rawLatest } = series;

    if (!candles.length) {
      return NextResponse.json(
        { error: "该股票暂无有效日 K 数据" },
        { status: 404 }
      );
    }

    const fallbackHighest =
      highestFromWeekMonth ??
      rawHighest ??
      candles.reduce<PricePoint | null>((acc, candle) => {
        if (!acc || candle.close > acc.price) {
          return { price: candle.close, time: candle.time };
        }
        return acc;
      }, null);

    const latestPoint =
      rawLatest ??
      (candles.length
        ? {
            price: candles[candles.length - 1].close,
            time: candles[candles.length - 1].time,
          }
        : null);

    if (!fallbackHighest || !latestPoint) {
      return NextResponse.json(
        { error: "该股票暂无有效收盘价数据" },
        { status: 404 }
      );
    }

    const target80Price = fallbackHighest.price * 0.2;

    // 当前价 = 最后一根有效 K 线的收盘价（通常为最近一个交易日）
    const expectedDropRatio =
      fallbackHighest.price * 0.8 !== 0
        ? (latestPoint.price - target80Price) / (fallbackHighest.price * 0.8)
        : null;

    const payload = {
      symbol: tsCode,
      name: basicInfo,
      highest: fallbackHighest,
      target80: {
        price: target80Price,
      },
      current: {
        price: latestPoint.price,
        time: latestPoint.time,
      },
      expectedDropRatio, // 例如 0.5 表示还完成了 50% 的“从最高跌到 -80%”之旅
      candles,
    };

    memoryCache.set(cacheKey, { timestamp: now, data: payload });

    return NextResponse.json(payload);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "请求第三方股票数据失败，请稍后重试" },
      { status: 500 }
    );
  }
}
