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
  displayOrder: number;
}

const SUPPORTED_INDICES: SupportedIndexMeta[] = [
  { code: "000016.SH", name: "上证50", category: "宽基", displayOrder: 10 },
  { code: "000300.SH", name: "沪深300", category: "宽基", displayOrder: 20 },
  { code: "000688.SH", name: "科创50", category: "宽基", displayOrder: 30 },
  { code: "000852.SH", name: "中证1000", category: "宽基", displayOrder: 40 },
  { code: "000905.SH", name: "中证500", category: "宽基", displayOrder: 50 },
  { code: "399006.SZ", name: "创业板指", category: "宽基", displayOrder: 60 },
  { code: "932000.CSI", name: "中证2000", category: "宽基", displayOrder: 70 },
  {
    code: "000922.CSI",
    name: "中证红利",
    category: "主题",
    displayOrder: 1000,
  },
  {
    code: "930955.CSI",
    name: "红利低波100",
    category: "主题",
    displayOrder: 1010,
  },
  { code: "000932.SH", name: "中证消费", category: "行业", displayOrder: 1020 },
  { code: "399997.SZ", name: "中证白酒", category: "行业", displayOrder: 1030 },
  {
    code: "000807.CSI",
    name: "食品饮料",
    category: "行业",
    displayOrder: 1040,
  },
  {
    code: "000808.CSI",
    name: "医药生物",
    category: "行业",
    displayOrder: 1050,
  },
  {
    code: "931152.CSI",
    name: "CS创新药",
    category: "主题",
    displayOrder: 1060,
  },
  { code: "399989.SZ", name: "中证医疗", category: "行业", displayOrder: 1070 },
  { code: "399967.SZ", name: "中证军工", category: "行业", displayOrder: 1080 },
  { code: "399986.SZ", name: "中证银行", category: "行业", displayOrder: 1090 },
  { code: "399975.SZ", name: "证券公司", category: "行业", displayOrder: 1100 },
  { code: "399998.SZ", name: "中证煤炭", category: "行业", displayOrder: 1110 },
  {
    code: "930708.CSI",
    name: "中证有色",
    category: "行业",
    displayOrder: 1120,
  },
  {
    code: "930606.CSI",
    name: "中证钢铁",
    category: "行业",
    displayOrder: 1130,
  },
  { code: "399971.SZ", name: "中证传媒", category: "行业", displayOrder: 1140 },
  { code: "000827.SH", name: "中证环保", category: "主题", displayOrder: 1150 },
  { code: "399976.SZ", name: "CS新能车", category: "主题", displayOrder: 1160 },
  {
    code: "931071.CSI",
    name: "人工智能",
    category: "主题",
    displayOrder: 1170,
  },
  {
    code: "931186.CSI",
    name: "中证科技",
    category: "主题",
    displayOrder: 1180,
  },
  {
    code: "000949.CSI",
    name: "中证农业",
    category: "行业",
    displayOrder: 1190,
  },
  {
    code: "930707.CSI",
    name: "中证畜牧",
    category: "行业",
    displayOrder: 1200,
  },
  {
    code: "930608.CSI",
    name: "中证基建",
    category: "行业",
    displayOrder: 1210,
  },
  {
    code: "000825.CSI",
    name: "中证央企红利",
    category: "主题",
    displayOrder: 1220,
  },
  {
    code: "000824.CSI",
    name: "中证国企红利",
    category: "主题",
    displayOrder: 1230,
  },
];

const LIST_FETCH_CONCURRENCY = 4;

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
  const valuationDate = valuations[valuations.length - 1]?.date;
  const priceDate = prices[prices.length - 1]?.date;
  return valuationDate ?? priceDate ?? "";
}

function latestClose(prices: readonly IndexPricePoint[]): number | null {
  return prices[prices.length - 1]?.close ?? null;
}

function historyHigh(prices: readonly IndexPricePoint[]): number | null {
  if (prices.length === 0) return null;
  return Math.max(...prices.map((point) => point.close));
}

function drawdownFromHighPct(
  close: number | null,
  high: number | null
): number | null {
  if (close === null || high === null || high <= 0) return null;
  return Math.round((close / high - 1) * 1000) / 10;
}

function supportedMeta(code: string): SupportedIndexMeta | null {
  return SUPPORTED_INDICES.find((item) => item.code === code) ?? null;
}

async function mapWithConcurrency<T, R>(
  values: readonly T[],
  concurrency: number,
  task: (value: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(values.length);
  let nextIndex = 0;
  const workerCount = Math.min(concurrency, values.length);

  async function worker() {
    while (nextIndex < values.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await task(values[currentIndex], currentIndex);
    }
  }

  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
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

async function buildIndexListRow(
  meta: SupportedIndexMeta
): Promise<IndexListRow | null> {
  const [prices, valuations] = await Promise.all([
    fetchIndexPrices(meta.code),
    fetchIndexValuations(meta.code),
  ]);

  const safePrices = prices ?? [];
  const safeValuations = valuations ?? [];
  const pePercentiles = buildPercentiles(safeValuations, "peTtm");
  const pbPercentiles = buildPercentiles(safeValuations, "pb");
  const close = latestClose(safePrices);
  const high = historyHigh(safePrices);

  return toListRow(
    {
      code: meta.code,
      name: meta.name,
      category: meta.category,
      asOfDate: latestDate(safePrices, safeValuations),
      listingAnchorDate: safePrices[0]?.date ?? safeValuations[0]?.date ?? "",
      peTtm: latestValue(safeValuations, (row) => row.peTtm),
      pb: latestValue(safeValuations, (row) => row.pb),
      percentilePeByChartWindow: pePercentiles,
      percentilePbByChartWindow: pbPercentiles,
      gaugePePercentile: pePercentiles.ALL,
      gaugePbPercentile: pbPercentiles.ALL,
      fullHistoryPrices: safePrices,
      fullHistoryValuation: safeValuations,
      industryComposition: EMPTY_INDUSTRY_COMPOSITION,
      etfs: [],
    },
    {
      displayOrder: meta.displayOrder,
      close,
      historyHigh: high,
      drawdownFromHighPct: drawdownFromHighPct(close, high),
    }
  );
}

interface IndexListRowMetrics {
  displayOrder: number;
  close: number | null;
  historyHigh: number | null;
  drawdownFromHighPct: number | null;
}

function toListRow(
  detail: IndexDetailRecord,
  metrics: IndexListRowMetrics
): IndexListRow {
  return {
    code: detail.code,
    name: detail.name,
    category: detail.category,
    displayOrder: metrics.displayOrder,
    asOfDate: detail.asOfDate,
    close: metrics.close,
    historyHigh: metrics.historyHigh,
    drawdownFromHighPct: metrics.drawdownFromHighPct,
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
  const details = await mapWithConcurrency(
    SUPPORTED_INDICES,
    LIST_FETCH_CONCURRENCY,
    buildIndexListRow
  );
  return details.filter((row): row is IndexListRow => row !== null);
}
