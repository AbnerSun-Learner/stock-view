import { fetchIndexDetailFromDatabase } from "@/lib/indices/server/index-db-reader";
import {
  fetchIndexIndustryComposition,
  fetchIndexPrices,
  fetchIndexValuations,
} from "@/lib/indices/server/tushare-runner";
import {
  getSupportedIndexMeta,
  getVisibleIndexMetas,
} from "@/lib/indices/supported-indices";
import type {
  IndexCategory,
  IndexChartWindow,
  IndexDetailRecord,
  IndexListRow,
  IndexListSnapshot,
  IndexListSnapshotNotice,
  IndexListSnapshotResult,
  IndexPricePoint,
  IndexValuationPoint,
  IndustryCompositionByLevel,
  SupportedIndexMeta,
} from "@/types/indices";
import { readFile } from "fs/promises";
import path from "path";

const SNAPSHOT_PATH = path.join(
  process.cwd(),
  "data",
  "indices",
  "list-snapshot.json"
);
const MARKET_CLOSE_HOUR = 15;
const MARKET_TZ = "Asia/Shanghai";
const MARKET_STALE_MAX_DAYS = 10;
const DATABASE_DETAIL_CATEGORIES = new Set<IndexCategory>(["宽基", "行业"]);

const EMPTY_INDUSTRY_COMPOSITION: IndustryCompositionByLevel = {
  asOfDate: null,
  sw1: [],
  sw2: [],
  sw3: [],
};

const CHART_WINDOWS: IndexChartWindow[] = [
  "YTD",
  "1Y",
  "3Y",
  "5Y",
  "10Y",
  "LISTED",
  "ALL",
];

function addYears(isoDate: string, deltaYears: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setFullYear(d.getFullYear() + deltaYears);
  return d.toISOString().slice(0, 10);
}

function januaryFirst(isoDate: string): string {
  return `${isoDate.slice(0, 4)}-01-01`;
}

function windowCutoff(
  latestDate: string,
  firstDate: string,
  window: IndexChartWindow
): string {
  if (window === "ALL" || window === "LISTED") return firstDate;
  if (window === "YTD") return januaryFirst(latestDate);
  const years =
    window === "1Y" ? 1 : window === "3Y" ? 3 : window === "5Y" ? 5 : 10;
  return addYears(latestDate, -years);
}

interface DatedValue {
  date: string;
  value: number;
}

interface BuildIndexDetailRecordArgs {
  meta: SupportedIndexMeta;
  prices: IndexPricePoint[];
  valuations: IndexValuationPoint[];
  industryComposition: IndustryCompositionByLevel;
}

function percentileOfLatest(
  values: readonly { date: string; value: number | null }[],
  window: IndexChartWindow
): number | null {
  const sorted: DatedValue[] = values.flatMap((row) =>
    row.value === null ? [] : [{ date: row.date, value: row.value }]
  );
  if (sorted.length === 0) return null;

  const latest = sorted[sorted.length - 1];
  const cutoff = windowCutoff(latest.date, sorted[0].date, window);
  const sample = sorted.filter((row) => row.date >= cutoff);
  if (sample.length === 0) return null;

  const belowOrEqual = sample.filter((row) => row.value <= latest.value).length;

  return Math.round((belowOrEqual / sample.length) * 1000) / 10;
}

function buildPercentiles(
  valuations: readonly IndexValuationPoint[],
  key: "peTtm" | "pb"
): Record<IndexChartWindow, number | null> {
  if (valuations.length < 2) {
    return CHART_WINDOWS.reduce((acc, window) => {
      acc[window] = null;
      return acc;
    }, {} as Record<IndexChartWindow, number | null>);
  }

  const values = valuations.map((point) => ({
    date: point.date,
    value: point[key],
  }));

  return CHART_WINDOWS.reduce((acc, window) => {
    acc[window] = percentileOfLatest(values, window);
    return acc;
  }, {} as Record<IndexChartWindow, number | null>);
}

function latestValue<T>(
  rows: readonly T[],
  pick: (row: T) => number | null
): number | null {
  for (let i = rows.length - 1; i >= 0; i--) {
    const value = pick(rows[i]);
    if (value !== null) return value;
  }
  return null;
}

function latestDate(
  prices: readonly IndexPricePoint[],
  valuations: readonly IndexValuationPoint[]
): string {
  const priceDate = prices[prices.length - 1]?.date;
  const valuationDate = valuations[valuations.length - 1]?.date;
  return priceDate ?? valuationDate ?? "";
}

function emptySnapshotNotice(
  title: string,
  description: string
): IndexListSnapshotNotice {
  return {
    status: "unavailable",
    title,
    description,
    marketDate: null,
    generatedAt: null,
  };
}

function getShanghaiParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MARKET_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${map.year}-${map.month}-${map.day}`,
    weekday: map.weekday ?? "",
    hour: Number.parseInt(map.hour ?? "0", 10),
    minute: Number.parseInt(map.minute ?? "0", 10),
  };
}

function isWeekend(weekday: string): boolean {
  return weekday === "Sat" || weekday === "Sun";
}

function daysBetweenDates(a: string, b: string): number {
  const start = Date.parse(`${a}T00:00:00Z`);
  const end = Date.parse(`${b}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return Infinity;
  return Math.round((end - start) / 86_400_000);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value);
}

function isIndexListRow(value: unknown): value is IndexListRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.code === "string" &&
    typeof row.name === "string" &&
    typeof row.category === "string" &&
    isFiniteNumber(row.displayOrder) &&
    isIsoDate(row.asOfDate) &&
    isNullableNumber(row.close) &&
    isNullableNumber(row.historyHigh) &&
    isNullableNumber(row.drawdownFromHighPct)
  );
}

function parseSnapshot(raw: unknown): IndexListSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const snapshot = raw as Record<string, unknown>;
  if (
    typeof snapshot.generatedAt !== "string" ||
    !isIsoDate(snapshot.marketDate) ||
    snapshot.marketTimeZone !== MARKET_TZ ||
    !Array.isArray(snapshot.rows) ||
    !Array.isArray(snapshot.failures)
  )
    return null;

  const rows = snapshot.rows.filter(isIndexListRow);
  if (rows.length !== snapshot.rows.length) return null;

  return {
    generatedAt: snapshot.generatedAt,
    marketDate: snapshot.marketDate,
    marketTimeZone: MARKET_TZ,
    rows,
    failures: [],
  };
}

async function readIndexListSnapshot(): Promise<IndexListSnapshot | null> {
  try {
    const raw = await readFile(SNAPSHOT_PATH, "utf-8");
    return parseSnapshot(JSON.parse(raw));
  } catch (error) {
    console.warn("[indices] failed to read list snapshot", error);
    return null;
  }
}

function validateSnapshotRows(rows: readonly IndexListRow[]): boolean {
  const expectedCodes = new Set(
    getVisibleIndexMetas().map((meta) => meta.code)
  );
  if (rows.length !== expectedCodes.size) return false;

  for (const row of rows) {
    if (!expectedCodes.has(row.code)) return false;
    if (row.close === null || row.historyHigh === null) return false;
  }
  return true;
}

function buildSnapshotNotice(
  snapshot: IndexListSnapshot
): IndexListSnapshotNotice {
  const now = getShanghaiParts();
  const generatedAt = new Date(snapshot.generatedAt);
  const generated = Number.isNaN(generatedAt.getTime())
    ? null
    : getShanghaiParts(generatedAt);
  const ageDays = daysBetweenDates(snapshot.marketDate, now.date);
  if (ageDays < 0 || ageDays > MARKET_STALE_MAX_DAYS) {
    return {
      status: "unavailable",
      title: "指数数据尚未更新",
      description: "当前快照日期异常，请稍后重试。",
      marketDate: snapshot.marketDate,
      generatedAt: snapshot.generatedAt,
    };
  }

  if (
    now.date === snapshot.marketDate ||
    now.hour < MARKET_CLOSE_HOUR ||
    isWeekend(now.weekday) ||
    generated?.date === now.date
  ) {
    return {
      status: "ready",
      title: "指数数据已更新",
      description: `当前展示 ${snapshot.marketDate} 交易日数据。`,
      marketDate: snapshot.marketDate,
      generatedAt: snapshot.generatedAt,
    };
  }

  return {
    status: "updating",
    title: "今日收盘数据更新中",
    description: `当前展示 ${snapshot.marketDate} 交易日数据，今日快照生成后会自动更新。`,
    marketDate: snapshot.marketDate,
    generatedAt: snapshot.generatedAt,
  };
}

function supportedMeta(code: string): SupportedIndexMeta | null {
  return getSupportedIndexMeta(code);
}

async function buildIndexDetail(
  meta: SupportedIndexMeta
): Promise<IndexDetailRecord | null> {
  if (DATABASE_DETAIL_CATEGORIES.has(meta.category))
    return buildDatabaseIndexDetail(meta);

  const [prices, valuations] = await Promise.all([
    fetchIndexPrices(meta.code),
    fetchIndexValuations(meta.code),
  ]);

  if (!prices?.length) return null;

  const safeValuations = valuations ?? [];
  const industryComposition =
    (await fetchIndexIndustryComposition(meta.code)) ??
    EMPTY_INDUSTRY_COMPOSITION;

  return buildIndexDetailRecord({
    meta,
    prices,
    valuations: safeValuations,
    industryComposition,
  });
}

async function buildDatabaseIndexDetail(
  meta: SupportedIndexMeta
): Promise<IndexDetailRecord | null> {
  const data = await fetchIndexDetailFromDatabase(meta.code);
  if (!data) return null;

  return buildIndexDetailRecord({
    meta,
    prices: data.prices,
    valuations: data.valuations,
    industryComposition: data.industryComposition,
  });
}

function buildIndexDetailRecord({
  meta,
  prices,
  valuations,
  industryComposition,
}: BuildIndexDetailRecordArgs): IndexDetailRecord {
  const pePercentiles = buildPercentiles(valuations, "peTtm");
  const pbPercentiles = buildPercentiles(valuations, "pb");

  return {
    code: meta.code,
    name: meta.name,
    category: meta.category,
    asOfDate: latestDate(prices, valuations),
    listingAnchorDate: prices[0].date,
    peTtm: latestValue(valuations, (row) => row.peTtm),
    pb: latestValue(valuations, (row) => row.pb),
    percentilePeByChartWindow: pePercentiles,
    percentilePbByChartWindow: pbPercentiles,
    gaugePePercentile: pePercentiles.ALL,
    gaugePbPercentile: pbPercentiles.ALL,
    fullHistoryPrices: prices,
    fullHistoryValuation: valuations,
    industryComposition: industryComposition ?? EMPTY_INDUSTRY_COMPOSITION,
    etfs: [],
  };
}

export function isSupportedRealIndex(code: string): boolean {
  return supportedMeta(code) !== null;
}

export async function getIndexDetail(
  code: string
): Promise<IndexDetailRecord | null> {
  const meta = supportedMeta(code);
  if (!meta) return null;
  return buildIndexDetail(meta);
}

export async function getIndexListSnapshotResult(): Promise<IndexListSnapshotResult> {
  const snapshot = await readIndexListSnapshot();
  if (!snapshot) {
    return {
      rows: [],
      notice: emptySnapshotNotice(
        "指数数据尚未生成",
        "当前还没有可用快照，请等待 GitHub Actions 完成收盘数据更新。"
      ),
    };
  }

  if (!validateSnapshotRows(snapshot.rows)) {
    return {
      rows: [],
      notice: emptySnapshotNotice(
        "指数数据暂不可用",
        "当前快照不完整，为避免展示错误行情，已暂停展示卡片数据。"
      ),
    };
  }

  const notice = buildSnapshotNotice(snapshot);
  if (notice.status === "unavailable") return { rows: [], notice };

  return {
    rows: snapshot.rows.sort((a, b) => a.displayOrder - b.displayOrder),
    notice,
  };
}
