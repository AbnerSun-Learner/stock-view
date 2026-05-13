/** M1 指数领域类型 */
export type IndexChartWindow =
  | "YTD"
  | "1Y"
  | "3Y"
  | "5Y"
  | "10Y"
  | "LISTED"
  | "ALL";

export type IndexCategory = "宽基" | "行业" | "主题" | "跨境";

export interface IndexPricePoint {
  date: string;
  close: number;
}

/** 估值走势点 */
export interface IndexValuationPoint {
  date: string;
  peTtm: number | null;
  pb: number | null;
}

export interface IndustryWeightRow {
  name: string;
  /** 权重百分比 0–100 */
  weightPct: number;
}

export interface IndustryCompositionByLevel {
  /** 行业权重数据截至日 */
  asOfDate: string | null;
  /** 申万一级 */
  sw1: IndustryWeightRow[];
  /** 申万二级 */
  sw2: IndustryWeightRow[];
  /** 申万三级 */
  sw3: IndustryWeightRow[];
}

/** 列表行 */
export interface IndexListRow {
  code: string;
  name: string;
  category: IndexCategory;
  /** 数据更新时间 / 截至日 */
  asOfDate: string;
  peTtm: number | null;
  /** 当前 PE 估值分位 */
  pePercentileCurrent: number | null;
  percentile5yPe: number | null;
  percentile10yPe: number | null;
  pb: number | null;
  pbPercentileCurrent: number | null;
  pbPercentile5y: number | null;
  pbPercentile10y: number | null;
}

export interface TrackingEtfRow {
  code: string;
  name: string;
  /** 基金规模（亿元人民币），无则 null */
  aumYi: number | null;
  /** 管理费率，如 0.0015 表示 0.15%/年 */
  expenseRatio: number | null;
  /** 近 N 日日均成交额（亿元人民币） */
  avgDailyTurnoverYi: number | null;
  /** 折溢价率（%） */
  premiumDiscount: number | null;
  /** 跟踪误差（%） */
  trackingError: number | null;
}

/** 详情聚合；价格序列为全历史，窗口由内联 slice 推导 */
export interface IndexDetailRecord {
  code: string;
  name: string;
  category: IndexCategory;
  /** 数据截至（交易日） */
  asOfDate: string;
  /** 上市以来参考起点（YYYY-MM-DD），用于「上市以来」区间截取 */
  listingAnchorDate: string;
  peTtm: number | null;
  pb: number | null;
  /** 各走势窗口 PE 分位 0–100，与所选时间区间联动展示 */
  percentilePeByChartWindow: Record<IndexChartWindow, number | null>;
  /** 各走势窗口 PB 分位 0–100 */
  percentilePbByChartWindow: Record<IndexChartWindow, number | null>;
  /** 仪表盘用：全历史视角下的 PE 分位 0–100 */
  gaugePePercentile: number | null;
  /** 仪表盘用：全历史视角下的 PB 分位 0–100 */
  gaugePbPercentile: number | null;
  /** 全样本收盘价走势（升序日期） */
  fullHistoryPrices: IndexPricePoint[];
  /** 估值序列（升序日期） */
  fullHistoryValuation: IndexValuationPoint[];
  /** 申万行业权重 */
  industryComposition: IndustryCompositionByLevel;
  etfs: TrackingEtfRow[];
}
