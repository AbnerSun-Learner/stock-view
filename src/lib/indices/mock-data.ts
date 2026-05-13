import type {
  IndexCategory,
  IndexChartWindow,
  IndexDetailRecord,
  IndexListRow,
  IndexPricePoint,
  IndexValuationPoint,
  IndustryCompositionByLevel,
} from "@/types/indices";

function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 确定性 MOCK：周线近似收盘价序列 */
function buildWeeklyCloseSeries(seed: number): IndexPricePoint[] {
  const rand = mulberry32(seed);
  const points: IndexPricePoint[] = [];
  const start = new Date("2012-06-01T12:00:00");
  const end = new Date("2026-05-08T12:00:00");
  let close = 1800 + (seed % 11) * 180;

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 7)) {
    const drift =
      (rand() - 0.48) * 0.028 + Math.sin(points.length * 0.08 + seed) * 0.006;
    close = Math.round(close * (1 + drift) * 100) / 100;
    points.push({
      date: d.toISOString().slice(0, 10),
      close,
    });
  }

  return points;
}

type LegacyPeWindow = {
  "1Y": number | null;
  "5Y": number | null;
  "10Y": number | null;
  ALL: number | null;
};

interface DetailSeed {
  code: string;
  name: string;
  category: IndexCategory;
  seriesSeed: number;
  /** 早于该日的样本在「上市以来」中会截掉，用于 MOCK 演示与「全部」区分 */
  listingAnchorDate?: string;
  peTtm: number | null;
  pb: number | null;
  percentileByWindow: LegacyPeWindow;
  pbPercentileByWindow?: LegacyPeWindow;
  /** 不传则自动生成 */
  industryComposition?: IndustryCompositionByLevel;
  etfs: IndexDetailRecord["etfs"];
}

function allLegacyNull(pe: LegacyPeWindow): boolean {
  return (
    pe["1Y"] === null &&
    pe["5Y"] === null &&
    pe["10Y"] === null &&
    pe.ALL === null
  );
}

function derivePbLegacy(pe: LegacyPeWindow, salt: number): LegacyPeWindow {
  if (allLegacyNull(pe)) {
    return { "1Y": null, "5Y": null, "10Y": null, ALL: null };
  }
  const j = (v: number | null, i: number): number | null => {
    if (v === null) return null;
    const d = ((salt + i * 13) % 11) - 5;
    return Math.min(99, Math.max(0, Math.round(v + d)));
  };
  return {
    "1Y": j(pe["1Y"], 1),
    "5Y": j(pe["5Y"], 2),
    "10Y": j(pe["10Y"], 3),
    ALL: j(pe.ALL, 4),
  };
}

function clampPct(n: number): number {
  return Math.min(99, Math.max(0, Math.round(n)));
}

function buildChartPercentiles(
  legacy: LegacyPeWindow,
  salt: number
): Record<IndexChartWindow, number | null> {
  const empty = (): Record<IndexChartWindow, number | null> => ({
    YTD: null,
    "1Y": null,
    "3Y": null,
    "5Y": null,
    "10Y": null,
    LISTED: null,
    ALL: null,
  });
  if (allLegacyNull(legacy)) return empty();

  const anchorRaw = legacy["1Y"] ?? legacy["5Y"] ?? legacy["10Y"] ?? legacy.ALL;
  if (anchorRaw === null) return empty();

  const y1Avail = anchorRaw;
  const y5 = legacy["5Y"] ?? legacy["10Y"] ?? legacy.ALL ?? y1Avail;
  const y10 = legacy["10Y"] ?? y5;
  const yAll = legacy.ALL ?? y10;

  const j = clampPct((salt % 7) - 3);

  let y3: number | null =
    legacy["1Y"] !== null && legacy["5Y"] !== null
      ? clampPct(legacy["1Y"]! * 0.38 + legacy["5Y"]! * 0.62 + j * 0.15)
      : legacy["5Y"] !== null
      ? clampPct(legacy["5Y"]! + j * 0.2)
      : legacy["1Y"];

  if (y3 === null) y3 = clampPct(y1Avail + j * 0.2);

  const ytdBase = legacy["1Y"] ?? y1Avail;
  const ytd = clampPct(ytdBase + j * 0.25);

  return {
    YTD: ytd,
    "1Y": legacy["1Y"],
    "3Y": y3,
    "5Y": legacy["5Y"],
    "10Y": legacy["10Y"],
    LISTED: yAll,
    ALL: yAll,
  };
}

function buildValuationSeries(
  prices: readonly IndexPricePoint[],
  peTtm: number | null,
  pb: number | null,
  seed: number
): IndexValuationPoint[] {
  const rand = mulberry32(seed + 9173);
  return prices.map((p, i) => {
    if (peTtm === null && pb === null)
      return { date: p.date, peTtm: null, pb: null };
    let peOut: number | null = null;
    let pbOut: number | null = null;
    if (peTtm !== null) {
      peOut =
        peTtm *
        (1 + Math.sin(i * 0.017 + seed) * 0.09 + (rand() - 0.5) * 0.028);
      peOut = Math.round(peOut * 100) / 100;
    }
    if (pb !== null) {
      pbOut =
        pb * (1 + Math.cos(i * 0.013 + seed) * 0.072 + (rand() - 0.5) * 0.022);
      pbOut = Math.round(pbOut * 1000) / 1000;
    }
    return { date: p.date, peTtm: peOut, pb: pbOut };
  });
}

function normWeights(rows: { name: string; weightPct: number }[]): {
  name: string;
  weightPct: number;
}[] {
  const sum = rows.reduce((a, r) => a + r.weightPct, 0);
  if (sum <= 0) return rows;
  return rows.map((r) => ({
    ...r,
    weightPct: Math.round(((r.weightPct * 100) / sum) * 10) / 10,
  }));
}

function industryFor(seed: DetailSeed): IndustryCompositionByLevel {
  if (seed.industryComposition) return seed.industryComposition;

  if (seed.code === "000932.SH") {
    return {
      asOfDate: AS_OF,
      sw1: normWeights([
        { name: "主要消费", weightPct: 78 },
        { name: "可选消费", weightPct: 22 },
      ]),
      sw2: normWeights([
        { name: "白酒Ⅱ", weightPct: 34 },
        { name: "食品", weightPct: 18 },
        { name: "养殖", weightPct: 14 },
        { name: "家居用品", weightPct: 14 },
        { name: "其他", weightPct: 20 },
      ]),
      sw3: normWeights([
        { name: "白酒Ⅲ", weightPct: 32 },
        { name: "啤酒", weightPct: 11 },
        { name: "调味发酵品Ⅲ", weightPct: 9 },
        { name: "乳品", weightPct: 9 },
        { name: "其他", weightPct: 39 },
      ]),
    };
  }

  if (seed.code === "399967.SZ") {
    return {
      asOfDate: AS_OF,
      sw1: normWeights([
        { name: "国防军工", weightPct: 94 },
        { name: "机械设备", weightPct: 6 },
      ]),
      sw2: normWeights([
        { name: "航空装备Ⅱ", weightPct: 28 },
        { name: "军工电子Ⅱ", weightPct: 22 },
        { name: "地面兵装Ⅱ", weightPct: 18 },
        { name: "航天装备Ⅱ", weightPct: 16 },
        { name: "其他", weightPct: 16 },
      ]),
      sw3: normWeights([
        { name: "航空装备Ⅲ", weightPct: 26 },
        { name: "军工电子Ⅲ", weightPct: 21 },
        { name: "地面兵装Ⅲ", weightPct: 17 },
        { name: "其他", weightPct: 36 },
      ]),
    };
  }

  /** 泛用宽基模板 */
  return {
    asOfDate: AS_OF,
    sw1: normWeights([
      { name: "工业", weightPct: 21 },
      { name: "金融", weightPct: 19 },
      { name: "信息技术", weightPct: 16 },
      { name: "原材料", weightPct: 13 },
      { name: "可选消费", weightPct: 12 },
      { name: "医药卫生", weightPct: 11 },
      { name: "其他", weightPct: 8 },
    ]),
    sw2: normWeights([
      { name: "电源设备", weightPct: 11 },
      { name: "半导体", weightPct: 10 },
      { name: "银行Ⅱ", weightPct: 9 },
      { name: "证券Ⅱ", weightPct: 8 },
      { name: "新能源动力系统", weightPct: 7 },
      { name: "其他", weightPct: 55 },
    ]),
    sw3: normWeights([
      { name: "锂电池", weightPct: 6 },
      { name: "集成电路", weightPct: 5 },
      { name: "城商行Ⅲ", weightPct: 4 },
      { name: "其他", weightPct: 85 },
    ]),
  };
}

const MOCK_DETAIL_SEEDS: DetailSeed[] = [
  {
    code: "000300.SH",
    name: "沪深300",
    category: "宽基",
    seriesSeed: 101,
    listingAnchorDate: "2018-01-01",
    peTtm: 11.86,
    pb: 1.31,
    percentileByWindow: { "1Y": 42, "5Y": 61, "10Y": 55, ALL: 68 },
    etfs: [
      {
        code: "510300.SH",
        name: "华泰柏瑞沪深300ETF",
        aumYi: 3985,
        expenseRatio: 0.0015,
        avgDailyTurnoverYi: 18.2,
        premiumDiscount: -0.02,
        trackingError: 0.03,
      },
      {
        code: "510310.SH",
        name: "易方达沪深300ETF",
        aumYi: 892,
        expenseRatio: 0.0015,
        avgDailyTurnoverYi: 4.1,
        premiumDiscount: 0.01,
        trackingError: 0.04,
      },
      {
        code: "159919.SZ",
        name: "嘉实沪深300ETF",
        aumYi: 756,
        expenseRatio: 0.0015,
        avgDailyTurnoverYi: 3.6,
        premiumDiscount: null,
        trackingError: null,
      },
    ],
  },
  {
    code: "000905.SH",
    name: "中证500",
    category: "宽基",
    seriesSeed: 202,
    peTtm: 21.4,
    pb: 1.92,
    percentileByWindow: { "1Y": 55, "5Y": 58, "10Y": 52, ALL: 64 },
    etfs: [
      {
        code: "510500.SH",
        name: "南方中证500ETF",
        aumYi: 512,
        expenseRatio: 0.0015,
        avgDailyTurnoverYi: 8.9,
        premiumDiscount: -0.04,
        trackingError: 0.05,
      },
    ],
  },
  {
    code: "399006.SZ",
    name: "创业板指",
    category: "宽基",
    seriesSeed: 303,
    peTtm: 28.1,
    pb: 4.2,
    percentileByWindow: { "1Y": 48, "5Y": 72, "10Y": 65, ALL: 70 },
    etfs: [
      {
        code: "159915.SZ",
        name: "易方达创业板ETF",
        aumYi: 642,
        expenseRatio: 0.0015,
        avgDailyTurnoverYi: 12.4,
        premiumDiscount: 0.03,
        trackingError: 0.06,
      },
    ],
  },
  {
    code: "000688.SH",
    name: "科创50",
    category: "主题",
    seriesSeed: 404,
    peTtm: 72.5,
    pb: 5.8,
    percentileByWindow: { "1Y": 38, "5Y": 44, "10Y": null, ALL: 51 },
    etfs: [
      {
        code: "588000.SH",
        name: "华夏上证科创板50ETF",
        aumYi: 918,
        expenseRatio: 0.0015,
        avgDailyTurnoverYi: 15.6,
        premiumDiscount: null,
        trackingError: 0.08,
      },
      {
        code: "588080.SH",
        name: "易方达上证科创板50ETF",
        aumYi: 156,
        expenseRatio: 0.0015,
        avgDailyTurnoverYi: 2.1,
        premiumDiscount: null,
        trackingError: 0.09,
      },
    ],
  },
  {
    code: "399673.SZ",
    name: "创业板50",
    category: "宽基",
    seriesSeed: 505,
    peTtm: 26.3,
    pb: 3.9,
    percentileByWindow: { "1Y": 51, "5Y": 69, "10Y": 61, ALL: 66 },
    etfs: [
      {
        code: "159949.SZ",
        name: "华安创业板50ETF",
        aumYi: 289,
        expenseRatio: 0.0015,
        avgDailyTurnoverYi: 5.2,
        premiumDiscount: null,
        trackingError: null,
      },
    ],
  },
  {
    code: "000932.SH",
    name: "中证消费",
    category: "行业",
    seriesSeed: 606,
    peTtm: 24.8,
    pb: 4.5,
    percentileByWindow: { "1Y": 62, "5Y": 78, "10Y": 82, ALL: 74 },
    etfs: [
      {
        code: "159928.SZ",
        name: "汇添富中证主要消费ETF",
        aumYi: 178,
        expenseRatio: 0.0015,
        avgDailyTurnoverYi: 2.8,
        premiumDiscount: -0.06,
        trackingError: 0.07,
      },
      {
        code: "510630.SH",
        name: "华夏消费ETF",
        aumYi: 42,
        expenseRatio: 0.0015,
        avgDailyTurnoverYi: 0.6,
        premiumDiscount: null,
        trackingError: null,
      },
    ],
  },
  {
    code: "399967.SZ",
    name: "中证军工",
    category: "行业",
    seriesSeed: 707,
    peTtm: 56.2,
    pb: 3.1,
    percentileByWindow: { "1Y": 33, "5Y": 41, "10Y": 48, ALL: 52 },
    etfs: [
      {
        code: "512660.SH",
        name: "国泰中证军工ETF",
        aumYi: 134,
        expenseRatio: 0.0015,
        avgDailyTurnoverYi: 3.4,
        premiumDiscount: 0.12,
        trackingError: null,
      },
    ],
  },
  {
    code: "931087.CSI",
    name: "中证红利",
    category: "主题",
    seriesSeed: 808,
    peTtm: 7.2,
    pb: 0.72,
    percentileByWindow: { "1Y": 58, "5Y": 35, "10Y": 28, ALL: 31 },
    /** 演示 PB 分位极端标注：当前低于 5Y/10Y */
    pbPercentileByWindow: { "1Y": 22, "5Y": 38, "10Y": 41, ALL: 30 },
    etfs: [
      {
        code: "515180.SH",
        name: "易方达中证红利ETF",
        aumYi: 96,
        expenseRatio: 0.0015,
        avgDailyTurnoverYi: 1.9,
        premiumDiscount: null,
        trackingError: 0.05,
      },
      {
        code: "510880.SH",
        name: "华泰柏瑞上证红利ETF",
        aumYi: 71,
        expenseRatio: 0.001,
        avgDailyTurnoverYi: 1.2,
        premiumDiscount: null,
        trackingError: null,
      },
    ],
  },
  {
    code: "HSI.HI",
    name: "恒生指数",
    category: "跨境",
    seriesSeed: 909,
    peTtm: 9.4,
    pb: null,
    percentileByWindow: { "1Y": 44, "5Y": 52, "10Y": 49, ALL: 56 },
    etfs: [
      {
        code: "159920.SZ",
        name: "华夏恒生ETF",
        aumYi: 421,
        expenseRatio: 0.0016,
        avgDailyTurnoverYi: 9.8,
        premiumDiscount: -0.18,
        trackingError: 0.11,
      },
    ],
  },
  {
    code: "NDX.GI",
    name: "纳斯达克100",
    category: "跨境",
    seriesSeed: 1010,
    peTtm: 32.6,
    pb: null,
    percentileByWindow: { "1Y": 71, "5Y": 85, "10Y": 88, ALL: 79 },
    etfs: [
      {
        code: "513100.SH",
        name: "国泰纳斯达克100ETF",
        aumYi: 312,
        expenseRatio: 0.008,
        avgDailyTurnoverYi: 6.5,
        premiumDiscount: null,
        trackingError: null,
      },
      {
        code: "159941.SZ",
        name: "易方达纳斯达克100ETF",
        aumYi: 198,
        expenseRatio: 0.008,
        avgDailyTurnoverYi: 4.2,
        premiumDiscount: null,
        trackingError: null,
      },
    ],
  },
  {
    code: "000852.SH",
    name: "中证1000",
    category: "宽基",
    seriesSeed: 1111,
    peTtm: 35.8,
    pb: 2.14,
    percentileByWindow: { "1Y": 47, "5Y": 63, "10Y": null, ALL: 59 },
    etfs: [
      {
        code: "512100.SH",
        name: "南方中证1000ETF",
        aumYi: 287,
        expenseRatio: 0.0015,
        avgDailyTurnoverYi: 7.1,
        premiumDiscount: null,
        trackingError: 0.04,
      },
    ],
  },
  {
    code: "NEWIDX.SH",
    name: "演示·历史不足指数",
    category: "主题",
    seriesSeed: 1212,
    peTtm: null,
    pb: null,
    percentileByWindow: { "1Y": null, "5Y": null, "10Y": null, ALL: null },
    etfs: [],
  },
];

const AS_OF = "2026-05-08";
const SERIES_ORIGIN_DATE = "2012-06-01";

function seedToDetail(seed: DetailSeed): IndexDetailRecord {
  let fullHistoryPrices = buildWeeklyCloseSeries(seed.seriesSeed);
  if (seed.code === "NEWIDX.SH")
    fullHistoryPrices = fullHistoryPrices.slice(-52);

  const legacyPbRaw =
    seed.pb === null
      ? ({ "1Y": null, "5Y": null, "10Y": null, ALL: null } as LegacyPeWindow)
      : seed.pbPercentileByWindow ??
        derivePbLegacy(seed.percentileByWindow, seed.seriesSeed);

  const percentilePeByChartWindow = buildChartPercentiles(
    seed.percentileByWindow,
    seed.seriesSeed
  );
  const percentilePbByChartWindow = buildChartPercentiles(
    legacyPbRaw,
    seed.seriesSeed + 11
  );

  const gaugePePercentile =
    seed.percentileByWindow.ALL ??
    seed.percentileByWindow["10Y"] ??
    seed.percentileByWindow["5Y"] ??
    seed.percentileByWindow["1Y"] ??
    null;

  const gaugePbPercentile =
    seed.pb === null
      ? null
      : legacyPbRaw.ALL ??
        legacyPbRaw["10Y"] ??
        legacyPbRaw["5Y"] ??
        legacyPbRaw["1Y"] ??
        null;

  const fullHistoryValuation = buildValuationSeries(
    fullHistoryPrices,
    seed.peTtm,
    seed.pb,
    seed.seriesSeed
  );

  return {
    code: seed.code,
    name: seed.name,
    category: seed.category,
    asOfDate: AS_OF,
    listingAnchorDate: seed.listingAnchorDate ?? SERIES_ORIGIN_DATE,
    peTtm: seed.peTtm,
    pb: seed.pb,
    percentilePeByChartWindow,
    percentilePbByChartWindow,
    gaugePePercentile,
    gaugePbPercentile,
    fullHistoryPrices,
    fullHistoryValuation,
    industryComposition: industryFor(seed),
    etfs: seed.etfs.map((e) => ({ ...e })),
  };
}

const DETAIL_BY_CODE: Map<string, IndexDetailRecord> = new Map(
  MOCK_DETAIL_SEEDS.map((s) => [s.code, seedToDetail(s)])
);

export function getMockIndexDetail(codeNorm: string): IndexDetailRecord | null {
  if (!codeNorm) return null;
  return DETAIL_BY_CODE.get(codeNorm) ?? null;
}

export function getMockIndexListRows(): IndexListRow[] {
  return MOCK_DETAIL_SEEDS.map((s) => {
    const pbLegacy =
      s.pb === null
        ? ({ "1Y": null, "5Y": null, "10Y": null, ALL: null } as LegacyPeWindow)
        : s.pbPercentileByWindow ??
          derivePbLegacy(s.percentileByWindow, s.seriesSeed);
    return {
      code: s.code,
      name: s.name,
      category: s.category,
      asOfDate: AS_OF,
      peTtm: s.peTtm,
      pePercentileCurrent: s.percentileByWindow["1Y"],
      percentile5yPe: s.percentileByWindow["5Y"],
      percentile10yPe: s.percentileByWindow["10Y"],
      pb: s.pb,
      pbPercentileCurrent: pbLegacy["1Y"],
      pbPercentile5y: pbLegacy["5Y"],
      pbPercentile10y: pbLegacy["10Y"],
    };
  });
}
