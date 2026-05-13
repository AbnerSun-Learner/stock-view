import {
  fetchIndexIndustryComposition,
  fetchIndexPrices,
  fetchIndexValuations,
} from "@/lib/indices/server/tushare-runner";
import type {
  IndexCategory,
  IndexChartWindow,
  IndexDetailRecord,
  IndexListRow,
  IndexPricePoint,
  IndexValuationPoint,
  IndustryCompositionByLevel,
} from "@/types/indices";

interface SupportedIndexMeta {
  code: string;
  name: string;
  category: IndexCategory;
}

const SUPPORTED_INDICES: SupportedIndexMeta[] = [
  { code: "000300.SH", name: "沪深300", category: "宽基" },
  { code: "000688.SH", name: "科创50", category: "主题" },
];

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
  const valuationDate = valuations[valuations.length - 1]?.date;
  const priceDate = prices[prices.length - 1]?.date;
  return valuationDate ?? priceDate ?? "";
}

function supportedMeta(code: string): SupportedIndexMeta | null {
  return SUPPORTED_INDICES.find((item) => item.code === code) ?? null;
}

async function buildIndexDetail(
  meta: SupportedIndexMeta
): Promise<IndexDetailRecord | null> {
  const [prices, valuations] = await Promise.all([
    fetchIndexPrices(meta.code),
    fetchIndexValuations(meta.code),
  ]);

  if (!prices?.length) return null;

  const safeValuations = valuations ?? [];
  const industryComposition =
    (await fetchIndexIndustryComposition(meta.code)) ??
    EMPTY_INDUSTRY_COMPOSITION;
  const pePercentiles = buildPercentiles(safeValuations, "peTtm");
  const pbPercentiles = buildPercentiles(safeValuations, "pb");

  return {
    code: meta.code,
    name: meta.name,
    category: meta.category,
    asOfDate: latestDate(prices, safeValuations),
    listingAnchorDate: prices[0].date,
    peTtm: latestValue(safeValuations, (row) => row.peTtm),
    pb: latestValue(safeValuations, (row) => row.pb),
    percentilePeByChartWindow: pePercentiles,
    percentilePbByChartWindow: pbPercentiles,
    gaugePePercentile: pePercentiles.ALL,
    gaugePbPercentile: pbPercentiles.ALL,
    fullHistoryPrices: prices,
    fullHistoryValuation: safeValuations,
    industryComposition: industryComposition ?? EMPTY_INDUSTRY_COMPOSITION,
    etfs: [],
  };
}

function toListRow(detail: IndexDetailRecord): IndexListRow {
  return {
    code: detail.code,
    name: detail.name,
    category: detail.category,
    asOfDate: detail.asOfDate,
    peTtm: detail.peTtm,
    pePercentileCurrent: detail.percentilePeByChartWindow.ALL,
    percentile5yPe: detail.percentilePeByChartWindow["5Y"],
    percentile10yPe: detail.percentilePeByChartWindow["10Y"],
    pb: detail.pb,
    pbPercentileCurrent: detail.percentilePbByChartWindow.ALL,
    pbPercentile5y: detail.percentilePbByChartWindow["5Y"],
    pbPercentile10y: detail.percentilePbByChartWindow["10Y"],
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

export async function getIndexListRows(): Promise<IndexListRow[]> {
  const details = await Promise.all(
    SUPPORTED_INDICES.map(async (meta) => {
      const [prices, valuations] = await Promise.all([
        fetchIndexPrices(meta.code),
        fetchIndexValuations(meta.code),
      ]);
      if (!prices?.length) return null;
      const safeValuations = valuations ?? [];
      const pePercentiles = buildPercentiles(safeValuations, "peTtm");
      const pbPercentiles = buildPercentiles(safeValuations, "pb");
      return toListRow({
        code: meta.code,
        name: meta.name,
        category: meta.category,
        asOfDate: latestDate(prices, safeValuations),
        listingAnchorDate: prices[0].date,
        peTtm: latestValue(safeValuations, (row) => row.peTtm),
        pb: latestValue(safeValuations, (row) => row.pb),
        percentilePeByChartWindow: pePercentiles,
        percentilePbByChartWindow: pbPercentiles,
        gaugePePercentile: pePercentiles.ALL,
        gaugePbPercentile: pbPercentiles.ALL,
        fullHistoryPrices: prices,
        fullHistoryValuation: safeValuations,
        industryComposition: EMPTY_INDUSTRY_COMPOSITION,
        etfs: [],
      });
    })
  );
  return details.filter((row): row is IndexListRow => row !== null);
}
