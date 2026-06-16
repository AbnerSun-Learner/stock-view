export type EtfCategory = "宽基" | "行业" | "跨境" | "商品" | "债券" | "货币";

export type EtfPoolSource = "行情中心" | "保底清单";

export interface EtfPoolItem {
  etfCode: string;
  etfName: string;
  category: EtfCategory;
  direction: string;
  source: EtfPoolSource;
  trackingIndexCode: string | null;
  trackingIndexName: string | null;
  aumYi: number | null;
  avgDailyTurnoverYi: number | null;
  premiumDiscount: number | null;
  expenseRatio: number | null;
}

export interface EtfPoolSection {
  category: EtfCategory;
  items: EtfPoolItem[];
}
