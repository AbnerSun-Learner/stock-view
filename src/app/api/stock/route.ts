import { spawn } from "node:child_process";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// 简单缓存，避免同一只股票频繁请求第三方接口（进程级，部署后可视情况替换为更高级缓存）
const memoryCache = new Map<string, { timestamp: number; data: unknown }>();

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 分钟
const DEFAULT_START_DATE = "1990-12-19"; // 上证开市
const PYTHON_BIN = process.env.PYTHON_BIN?.trim() || "python3";
const BAOSTOCK_FETCHER_PATH = path.join(
  process.cwd(),
  "scripts",
  "baostock_fetcher.py"
);

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

type BaostockFetcherInput = {
  code: string;
  startDate: string;
  endDate: string;
};

type BaostockFetcherDailyRow = {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
};

type BaostockFetcherOutput = {
  name: string | null;
  daily: BaostockFetcherDailyRow[];
};

type RawFetcherOutput = {
  name?: unknown;
  daily?: unknown;
};

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

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function normalizeFetcherOutput(raw: RawFetcherOutput): BaostockFetcherOutput {
  const name =
    typeof raw.name === "string" && raw.name.trim().length
      ? raw.name.trim()
      : null;

  const daily = Array.isArray(raw.daily)
    ? raw.daily
        .map((row) => {
          if (!row || typeof row !== "object") {
            return null;
          }
          const record = row as Record<string, unknown>;
          const date =
            typeof record.date === "string" && record.date.trim().length
              ? record.date.trim()
              : null;
          if (!date) {
            return null;
          }

          return {
            date,
            open: toNumber(record.open),
            high: toNumber(record.high),
            low: toNumber(record.low),
            close: toNumber(record.close),
            volume: toNumber(record.volume),
          };
        })
        .filter((row): row is BaostockFetcherDailyRow => Boolean(row))
    : [];

  return { name, daily };
}

async function runBaostockFetcher(
  input: BaostockFetcherInput
): Promise<BaostockFetcherOutput> {
  return new Promise((resolve, reject) => {
    const child = spawn(PYTHON_BIN, [BAOSTOCK_FETCHER_PATH], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.once("error", (error) => reject(error));
    child.once("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            stderr.trim() ||
              stdout.trim() ||
              `Baostock fetcher exited with code ${code}`
          )
        );
        return;
      }

      try {
        const raw = JSON.parse(stdout || "{}") as RawFetcherOutput;
        resolve(normalizeFetcherOutput(raw));
      } catch (err) {
        reject(
          new Error(
            `无法解析 Baostock 响应: ${
              err instanceof Error ? err.message : String(err)
            }`
          )
        );
      }
    });

    child.stdin.end(JSON.stringify(input));
  });
}

function buildStockSeries(rows: BaostockFetcherDailyRow[]): StockSeries {
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
    if (!acc || candle.close > acc.price) {
      return { price: candle.close, time: candle.time };
    }
    return acc;
  }, null);

  const rawLatest = {
    price: candles[candles.length - 1].close,
    time: candles[candles.length - 1].time,
  };

  return { candles, rawHighest, rawLatest };
}

async function fetchStockPayload(tsCode: string) {
  const today = formatDate(new Date());
  const output = await runBaostockFetcher({
    code: tsCode,
    startDate: DEFAULT_START_DATE,
    endDate: today,
  });
  const series = buildStockSeries(output.daily);
  return { name: output.name, series };
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

  const cacheKey = tsCode;
  const cached = memoryCache.get(cacheKey);
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  try {
    const { name, series } = await fetchStockPayload(tsCode);
    const { candles, rawHighest, rawLatest } = series;

    if (!candles.length) {
      return NextResponse.json(
        { error: "该股票暂无有效日 K 数据" },
        { status: 404 }
      );
    }

    const fallbackHighest =
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
    const denominator = fallbackHighest.price * 0.8;
    const expectedDropRatio =
      denominator !== 0
        ? (latestPoint.price - target80Price) / denominator
        : null;

    const payload = {
      symbol: tsCode,
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
      { error: "请求 Baostock 数据失败，请稍后重试" },
      { status: 500 }
    );
  }
}
