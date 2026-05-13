import type {
  IndexPricePoint,
  IndexValuationPoint,
  IndustryCompositionByLevel,
  IndustryWeightRow,
} from "@/types/indices";
import { execFile } from "child_process";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const PYTHON_BIN = process.env.PYTHON_BIN ?? "python3";
const PROCESS_TIMEOUT_MS = Math.min(
  180_000,
  Math.max(
    15_000,
    Number.parseInt(process.env.CORRELATION_SCRIPT_TIMEOUT_MS ?? "90000", 10) ||
      90_000
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
const MAX_BUFFER = 16 * 1024 * 1024;

interface CacheEntry<T> {
  data: T | null;
  ts: number;
  ttl: number;
}

interface RawPricePayload {
  symbol?: string;
  points?: unknown[];
}

interface RawValuationPayload {
  symbol?: string;
  points?: unknown[];
}

interface RawIndustryPayload {
  symbol?: string;
  asOfDate?: unknown;
  sw1?: unknown[];
  sw2?: unknown[];
  sw3?: unknown[];
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const MISS_TTL_MS = 60 * 1000;
const INDUSTRY_CACHE_TTL_MS = 60 * 60 * 1000;

const priceCache = new Map<string, CacheEntry<IndexPricePoint[]>>();
const valuationCache = new Map<string, CacheEntry<IndexValuationPoint[]>>();
const industryCache = new Map<string, CacheEntry<IndustryCompositionByLevel>>();
const INDUSTRY_CACHE_KEY_REV = ":sw2021_batch_v2";

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
  ttl = CACHE_TTL_MS
) {
  map.set(key, {
    data,
    ts: Date.now(),
    ttl: data === null ? MISS_TTL_MS : ttl,
  });
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
      try {
        return JSON.parse(trimmed);
      } catch (parseError) {
        throw new Error(
          `python script produced invalid JSON: ${filename}; ${
            parseError instanceof Error
              ? parseError.message
              : String(parseError)
          }`
        );
      }
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

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function pickFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function parsePricePoints(raw: unknown[]): IndexPricePoint[] {
  const points: IndexPricePoint[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const close = pickFiniteNumber(row.close);
    if (!isIsoDate(row.date) || close === null || close <= 0) continue;
    points.push({ date: row.date, close });
  }
  return points.sort((a, b) => a.date.localeCompare(b.date));
}

function parseValuationPoints(raw: unknown[]): IndexValuationPoint[] {
  const points: IndexValuationPoint[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (!isIsoDate(row.date)) continue;
    points.push({
      date: row.date,
      peTtm: pickFiniteNumber(row.peTtm),
      pb: pickFiniteNumber(row.pb),
    });
  }
  return points.sort((a, b) => a.date.localeCompare(b.date));
}

function parseIndustryRows(raw: unknown[]): IndustryWeightRow[] {
  const rows: IndustryWeightRow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const name = typeof row.name === "string" ? row.name.trim() : "";
    const weightPct = pickFiniteNumber(row.weightPct);
    if (!name || weightPct === null || weightPct <= 0) continue;
    rows.push({ name, weightPct });
  }
  return rows.sort((a, b) => b.weightPct - a.weightPct);
}

function parseIndustryComposition(
  raw: RawIndustryPayload
): IndustryCompositionByLevel {
  return {
    asOfDate: isIsoDate(raw.asOfDate) ? raw.asOfDate : null,
    sw1: parseIndustryRows(raw.sw1 ?? []),
    sw2: parseIndustryRows(raw.sw2 ?? []),
    sw3: parseIndustryRows(raw.sw3 ?? []),
  };
}

export async function fetchIndexPrices(
  code: string
): Promise<IndexPricePoint[] | null> {
  const cached = readCache(priceCache, code);
  if (cached !== undefined) return cached;

  try {
    const result = (await runScript(
      "fetch_index_daily.py",
      code
    )) as RawPricePayload;
    const points = parsePricePoints(result?.points ?? []);
    if (points.length === 0) {
      writeCache(priceCache, code, null);
      return null;
    }
    writeCache(priceCache, code, points);
    return points;
  } catch (error) {
    console.error(`[indices] fetchIndexPrices failed for ${code}`, error);
    writeCache(priceCache, code, null);
    return null;
  }
}

export async function fetchIndexValuations(
  code: string
): Promise<IndexValuationPoint[] | null> {
  const cached = readCache(valuationCache, code);
  if (cached !== undefined) return cached;

  try {
    const result = (await runScript(
      "fetch_index_valuation.py",
      code
    )) as RawValuationPayload;
    const points = parseValuationPoints(result?.points ?? []);
    if (points.length === 0) {
      writeCache(valuationCache, code, null);
      return null;
    }
    writeCache(valuationCache, code, points);
    return points;
  } catch (error) {
    console.error(`[indices] fetchIndexValuations failed for ${code}`, error);
    writeCache(valuationCache, code, null);
    return null;
  }
}

export async function fetchIndexIndustryComposition(
  code: string
): Promise<IndustryCompositionByLevel | null> {
  const cacheKey = `${code}${INDUSTRY_CACHE_KEY_REV}`;
  const cached = readCache(industryCache, cacheKey);
  if (cached !== undefined) return cached;

  try {
    const result = (await runScript(
      "fetch_index_industry.py",
      code
    )) as RawIndustryPayload;
    const data = parseIndustryComposition(result);
    if (
      data.sw1.length === 0 &&
      data.sw2.length === 0 &&
      data.sw3.length === 0
    ) {
      writeCache(industryCache, cacheKey, null);
      return null;
    }
    writeCache(industryCache, cacheKey, data, INDUSTRY_CACHE_TTL_MS);
    return data;
  } catch (error) {
    console.error(
      `[indices] fetchIndexIndustryComposition failed for ${code}`,
      error
    );
    writeCache(industryCache, cacheKey, null);
    return null;
  }
}

export function __clearIndexTushareCachesForTest() {
  priceCache.clear();
  valuationCache.clear();
  industryCache.clear();
}
