/**
 * /api/correlation 的数据获取层。
 *
 * 关键约束：
 * - 用 execFile（参数数组）调用 Python 脚本，避免命令注入。
 * - 内存缓存与 valuation API 对齐：交易日收盘后缩短 TTL。
 * - 并发受限，避免一次性把 Python 子进程打满。
 * - 单只 ETF 数据失败不抛出，转化为 null 返回，由上层做降级。
 */

import type {
  EtfHoldings,
  EtfPriceSeries,
  HoldingItem,
  PricePoint,
} from "@/types/correlation";
import { isAfterMarketClose } from "@/lib/market-calendar";
import { execFile } from "child_process";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const KLINE_TTL_MS = 5 * 60 * 1000;
const KLINE_TTL_AFTER_CLOSE_MS = 60 * 1000;
/** 持仓数据按季度发布，缓存可长一些 */
const HOLDINGS_TTL_MS = 60 * 60 * 1000;

const PYTHON_BIN = process.env.PYTHON_BIN ?? "python3";
const PROCESS_TIMEOUT_MS = 30 * 1000;
const MAX_BUFFER = 8 * 1024 * 1024;
const DEFAULT_CONCURRENCY = 5;

interface CacheEntry<T> {
  data: T | null;
  ts: number;
  ttl: number;
}

const klineCache = new Map<string, CacheEntry<EtfPriceSeries>>();
const holdingsCache = new Map<string, CacheEntry<EtfHoldings | null>>();

function klineTtl(): number {
  return isAfterMarketClose() ? KLINE_TTL_AFTER_CLOSE_MS : KLINE_TTL_MS;
}

function readCache<T>(map: Map<string, CacheEntry<T>>, key: string): T | null | undefined {
  const entry = map.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.ts > entry.ttl) {
    map.delete(key);
    return undefined;
  }
  return entry.data;
}

function writeCache<T>(
  map: Map<string, CacheEntry<T>>,
  key: string,
  data: T | null,
  ttl: number
) {
  map.set(key, { data, ts: Date.now(), ttl });
}

function scriptPath(filename: string): string {
  return path.join(process.cwd(), "scripts", filename);
}

async function runScript(filename: string, code: string): Promise<unknown> {
  const { stdout } = await execFileAsync(PYTHON_BIN, [scriptPath(filename), code], {
    timeout: PROCESS_TIMEOUT_MS,
    maxBuffer: MAX_BUFFER,
    encoding: "utf-8",
  });
  return JSON.parse(stdout);
}

export async function fetchKline(code: string): Promise<EtfPriceSeries | null> {
  const cached = readCache(klineCache, code);
  if (cached !== undefined) return cached;

  try {
    const result = (await runScript("fetch_etf_kline.py", code)) as {
      symbol: string;
      points: PricePoint[];
    };
    if (!result?.points?.length) {
      writeCache(klineCache, code, null, klineTtl());
      return null;
    }
    const series: EtfPriceSeries = {
      code: result.symbol ?? code,
      points: result.points,
    };
    writeCache(klineCache, code, series, klineTtl());
    return series;
  } catch (error) {
    console.error(`[correlation] fetchKline failed for ${code}`, error);
    writeCache(klineCache, code, null, klineTtl());
    return null;
  }
}

interface RawHoldingsPayload {
  symbol: string;
  source: "top10" | "full";
  quarter: string | null;
  items: HoldingItem[];
  reason?: string;
}

export async function fetchHoldings(code: string): Promise<EtfHoldings | null> {
  const cached = readCache(holdingsCache, code);
  if (cached !== undefined) return cached;

  try {
    const result = (await runScript(
      "fetch_etf_holdings.py",
      code
    )) as RawHoldingsPayload;

    if (!result?.items?.length) {
      // 区分 non-equity-or-no-data 与一般失败：脚本本身能跑通且返回 reason，
      // 此时也写 null 到缓存，对上层而言是 "成分不可用"。
      writeCache(holdingsCache, code, null, HOLDINGS_TTL_MS);
      return null;
    }
    const holdings: EtfHoldings = {
      code: result.symbol ?? code,
      source: result.source ?? "top10",
      items: result.items,
    };
    writeCache(holdingsCache, code, holdings, HOLDINGS_TTL_MS);
    return holdings;
  } catch (error) {
    console.error(`[correlation] fetchHoldings failed for ${code}`, error);
    writeCache(holdingsCache, code, null, HOLDINGS_TTL_MS);
    return null;
  }
}

/**
 * 受限并发执行任务。
 * 第一版只在内部用，后续可抽到 utils。
 */
export async function runWithConcurrency<T, R>(
  items: T[],
  worker: (item: T) => Promise<R>,
  concurrency = DEFAULT_CONCURRENCY
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function next(): Promise<void> {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await worker(items[i]);
    }
  }
  const runners = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => next()
  );
  await Promise.all(runners);
  return results;
}

export interface FetchedEtfData {
  code: string;
  kline: EtfPriceSeries | null;
  holdings: EtfHoldings | null;
}

export async function fetchAllEtfData(
  codes: string[],
  concurrency = DEFAULT_CONCURRENCY
): Promise<FetchedEtfData[]> {
  return runWithConcurrency(
    codes,
    async (code) => {
      const [kline, holdings] = await Promise.all([
        fetchKline(code),
        fetchHoldings(code),
      ]);
      return { code, kline, holdings };
    },
    concurrency
  );
}

/** 测试辅助：清理所有缓存 */
export function __clearCorrelationCachesForTest() {
  klineCache.clear();
  holdingsCache.clear();
}
