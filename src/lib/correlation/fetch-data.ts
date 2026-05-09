/**
 * /api/correlation 的数据获取层。
 *
 * ETF 的行情、持仓、场内简称与市值均只通过 TuShare 拉取：由 scripts 下 Python
 *（fetch_etf_kline.py / fetch_etf_holdings.py / fetch_etf_spot.py）封装具体接口；
 * 需在本进程环境中提供 `TUSHARE_TOKEN`，可选 `DATA_API`（HTTPS 网关，见 tushare_client），
 * 本模块仅负责调用子进程与缓存，不引入其它行情或基本面数据源。
 *
 * 关键约束：
 * - 用 execFile（参数数组）调用 Python 脚本，避免命令注入。
 * - 内存缓存：成功拉数较长 TTL；失败/空条目短 TTL。K 线 key 含策略版本后缀，数据源策略变更后不命中旧条目。
 * - 受限并发（见 DEFAULT_ETF_FETCH_CONCURRENCY / CORRELATION_ETF_FETCH_CONCURRENCY）；成对 ETF 分析应传 ETF 并发 1，避免多只子进程并行打爆 TuShare 代理（RemoteDisconnected）。
 * - 单只 ETF 数据失败不抛出，转化为 null 返回，由上层做降级。
 */

import type { EtfSpotBrief } from "@/lib/correlation/etf-profiles";
import { isAfterMarketClose } from "@/lib/market-calendar";
import type {
  EtfHoldings,
  EtfPriceSeries,
  HoldingItem,
  HoldingSectorShare,
  PricePoint,
} from "@/types/correlation";
import { execFile } from "child_process";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const KLINE_TTL_MS = 5 * 60 * 1000;
const KLINE_TTL_AFTER_CLOSE_MS = 60 * 1000;
/** 点数为空或脚本异常：短 TTL，避免修脚本后仍长时间命中旧 null */
const KLINE_MISS_TTL_MS = 60 * 1000;
/**
 * K 线抓取策略变更时 bump，与 code 拼成 Map key，避免旧进程的 null 条目长期有效。
 */
const KLINE_CACHE_KEY_REV = ":fd_v1";

/** 持仓数据按季度发布，缓存可长一些 */
const HOLDINGS_TTL_MS = 60 * 60 * 1000;
const HOLDINGS_CACHE_KEY_REV = ":sec_v1";
/** 失败或空条目：短 TTL */
const HOLDINGS_MISS_TTL_MS = 5 * 60 * 1000;
const SPOT_TTL_MS = 5 * 60 * 1000;
const SPOT_MISS_TTL_MS = 2 * 60 * 1000;
const SPOT_CACHE_KEY_REV = ":meta_v4";

const PYTHON_BIN = process.env.PYTHON_BIN ?? "python3";
const PROCESS_TIMEOUT_MS = Math.min(
  180_000,
  Math.max(
    15_000,
    Number.parseInt(process.env.CORRELATION_SCRIPT_TIMEOUT_MS ?? "90000", 10) ||
      90_000
  )
);
const MAX_BUFFER = 8 * 1024 * 1024;
/** 批量 ETF 网格：默认略保守，可通过 CORRELATION_ETF_FETCH_CONCURRENCY 调到 1–5 */
const DEFAULT_ETF_FETCH_CONCURRENCY = Math.min(
  5,
  Math.max(
    1,
    Number.parseInt(process.env.CORRELATION_ETF_FETCH_CONCURRENCY ?? "2", 10) ||
      2
  )
);
const SCRIPT_RETRY_ATTEMPTS = Math.max(
  1,
  Math.min(
    6,
    Number.parseInt(process.env.CORRELATION_SCRIPT_RETRY ?? "3", 10) || 3
  )
);
const SCRIPT_RETRY_BASE_MS = 500;

function isRetryableExecError(error: unknown): boolean {
  const text =
    error instanceof Error
      ? `${error.message}\n${error.stack ?? ""}`
      : String(error);
  return /Connection aborted|RemoteDisconnected|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket hang up|timed out|reset by peer|\b502\b|\b503\b|\b504\b|TLS|SSLHandshake/i.test(
    text
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function scriptPath(filename: string): string {
  return path.join(process.cwd(), "scripts", filename);
}

async function runScript(filename: string, code: string): Promise<unknown> {
  let lastError: unknown;
  for (let attempt = 0; attempt < SCRIPT_RETRY_ATTEMPTS; attempt++) {
    try {
      const { stdout } = await execFileAsync(
        PYTHON_BIN,
        [scriptPath(filename), code],
        {
          timeout: PROCESS_TIMEOUT_MS,
          maxBuffer: MAX_BUFFER,
          encoding: "utf-8",
        }
      );
      const trimmed = stdout?.trim() ?? "";
      if (!trimmed) {
        throw new Error(`python script produced empty stdout: ${filename}`);
      }
      return JSON.parse(trimmed);
    } catch (error) {
      lastError = error;
      const willRetry =
        attempt < SCRIPT_RETRY_ATTEMPTS - 1 && isRetryableExecError(error);
      if (!willRetry) throw error;
      await sleep(SCRIPT_RETRY_BASE_MS * (attempt + 1));
    }
  }
  throw lastError ?? new Error("runScript retries exhausted");
}

interface CacheEntry<T> {
  data: T | null;
  ts: number;
  ttl: number;
}

const klineCache = new Map<string, CacheEntry<EtfPriceSeries>>();
const holdingsCache = new Map<string, CacheEntry<EtfHoldings | null>>();
const spotCache = new Map<string, CacheEntry<EtfSpotBrief | null>>();

function klineTtl(): number {
  return isAfterMarketClose() ? KLINE_TTL_AFTER_CLOSE_MS : KLINE_TTL_MS;
}

function klineCacheKey(code: string): string {
  return `${code}${KLINE_CACHE_KEY_REV}`;
}

function holdingsCacheKey(code: string): string {
  return `${code}${HOLDINGS_CACHE_KEY_REV}`;
}

function spotCacheKey(code: string): string {
  return `${code}${SPOT_CACHE_KEY_REV}`;
}

function readCache<T>(
  map: Map<string, CacheEntry<T>>,
  key: string
): T | null | undefined {
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

export async function fetchKline(code: string): Promise<EtfPriceSeries | null> {
  const ck = klineCacheKey(code);
  const cached = readCache(klineCache, ck);
  if (cached !== undefined) return cached;

  try {
    const result = (await runScript("fetch_etf_kline.py", code)) as {
      symbol: string;
      points: PricePoint[];
    };
    if (!result?.points?.length) {
      writeCache(klineCache, ck, null, KLINE_MISS_TTL_MS);
      return null;
    }
    const series: EtfPriceSeries = {
      code: result.symbol ?? code,
      points: result.points,
    };
    writeCache(klineCache, ck, series, klineTtl());
    return series;
  } catch (error) {
    console.error(`[correlation] fetchKline failed for ${code}`, error);
    writeCache(klineCache, ck, null, KLINE_MISS_TTL_MS);
    return null;
  }
}

interface RawHoldingsPayload {
  symbol: string;
  source: "top10" | "full";
  quarter: string | null;
  items: HoldingItem[];
  sectors?: HoldingSectorShare[];
  reason?: string;
}

interface RawSpotPayload {
  symbol: string;
  name: string | null;
  totalMvYuan: number | null;
  trackingIndex?: string | null;
  listedYear?: number | null;
  expenseRatio?: number | null;
}

export async function fetchEtfSpot(code: string): Promise<EtfSpotBrief | null> {
  const ck = spotCacheKey(code);
  const cached = readCache(spotCache, ck);
  if (cached !== undefined) return cached;

  try {
    const result = (await runScript(
      "fetch_etf_spot.py",
      code
    )) as RawSpotPayload;

    const listed =
      result.listedYear != null &&
      Number.isFinite(result.listedYear) &&
      result.listedYear > 1900
        ? Math.round(result.listedYear)
        : null;
    const expense =
      result.expenseRatio != null &&
      Number.isFinite(result.expenseRatio) &&
      result.expenseRatio > 0
        ? result.expenseRatio
        : null;
    const track =
      result.trackingIndex != null &&
      typeof result.trackingIndex === "string" &&
      result.trackingIndex.trim().length > 0
        ? result.trackingIndex.trim()
        : null;

    const brief: EtfSpotBrief = {
      code: result.symbol ?? code,
      name:
        result.name != null &&
        typeof result.name === "string" &&
        result.name.trim().length > 0
          ? result.name.trim()
          : null,
      totalMvYuan:
        result.totalMvYuan != null && Number.isFinite(result.totalMvYuan)
          ? result.totalMvYuan
          : null,
    };
    if (track) brief.trackingIndex = track;
    if (listed != null) brief.listedYear = listed;
    if (expense != null) brief.expenseRatio = expense;

    writeCache(spotCache, ck, brief, SPOT_TTL_MS);
    return brief;
  } catch (error) {
    console.error(`[correlation] fetchEtfSpot failed for ${code}`, error);
    writeCache(spotCache, ck, null, SPOT_MISS_TTL_MS);
    return null;
  }
}

export async function fetchHoldings(code: string): Promise<EtfHoldings | null> {
  const ck = holdingsCacheKey(code);
  const cached = readCache(holdingsCache, ck);
  if (cached !== undefined) return cached;

  try {
    const result = (await runScript(
      "fetch_etf_holdings.py",
      code
    )) as RawHoldingsPayload;

    if (!result?.items?.length) {
      // 区分 non-equity-or-no-data 与一般失败：脚本本身能跑通且返回 reason，
      // 此时也写 null 到缓存，对上层而言是 "成分不可用"。
      writeCache(holdingsCache, ck, null, HOLDINGS_MISS_TTL_MS);
      return null;
    }

    let sectors: HoldingSectorShare[] | undefined;
    if (Array.isArray(result.sectors) && result.sectors.length) {
      const parsed: HoldingSectorShare[] = [];
      for (const row of result.sectors) {
        if (!row || typeof row !== "object") continue;
        const nm =
          "name" in row && typeof row.name === "string" ? row.name.trim() : "";
        const w =
          "weight" in row &&
          typeof row.weight === "number" &&
          Number.isFinite(row.weight) &&
          row.weight > 0
            ? row.weight
            : null;
        if (!nm || w == null) continue;
        parsed.push({ name: nm, weight: w });
      }
      if (parsed.length) sectors = parsed;
    }

    const holdings: EtfHoldings = {
      code: result.symbol ?? code,
      source: result.source ?? "top10",
      items: result.items,
    };
    if (sectors?.length) holdings.sectors = sectors;

    writeCache(holdingsCache, ck, holdings, HOLDINGS_TTL_MS);
    return holdings;
  } catch (error) {
    console.error(`[correlation] fetchHoldings failed for ${code}`, error);
    writeCache(holdingsCache, ck, null, HOLDINGS_MISS_TTL_MS);
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
  concurrency = DEFAULT_ETF_FETCH_CONCURRENCY
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
  spot: EtfSpotBrief | null;
}

export async function fetchAllEtfData(
  codes: string[],
  concurrency = DEFAULT_ETF_FETCH_CONCURRENCY
): Promise<FetchedEtfData[]> {
  return runWithConcurrency(
    codes,
    async (code) => {
      const kline = await fetchKline(code);
      const holdings = await fetchHoldings(code);
      const spot = await fetchEtfSpot(code);
      return { code, kline, holdings, spot };
    },
    concurrency
  );
}

/** 测试辅助：清理所有缓存 */
export function __clearCorrelationCachesForTest() {
  klineCache.clear();
  holdingsCache.clear();
  spotCache.clear();
}
