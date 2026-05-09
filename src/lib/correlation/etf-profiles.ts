/**
 * ETF 对比表用的展示型档案。
 * 跟踪指数 / 费率 / 上市年：fund_basic；
 * 前五大重仓、行业近似分布：fund_portfolio + stock_basic（行业字段）。
 */

import type { EtfHoldings } from "@/types/correlation";
import { toFractionWeights } from "./holding-overlap";

export interface EtfSpotBrief {
  code: string;
  name: string | null;
  /** 总市值，人民币元 */
  totalMvYuan: number | null;
  /** fund_basic.benchmark */
  trackingIndex?: string | null;
  /** 上市日年份 */
  listedYear?: number | null;
  /** 管理费+托管费，0–1 */
  expenseRatio?: number | null;
}

export interface SectorWeight {
  name: string;
  weight: number;
}

export interface HoldingItemMock {
  name: string;
  weight: number;
}

export interface EtfProfile {
  code: string;
  name: string;
  /** 规模，单位亿元 */
  aum: number;
  /** 综合费率，0–1；未披露时为 0 */
  expenseRatio: number;
  topSectors: SectorWeight[];
  topHoldings: HoldingItemMock[];
  /** 跟踪指数；未接入单独字段时占位 */
  trackingIndex: string;
  /** 上市年份；未披露时为 0 */
  listedYear: number;
}

/**
 * 根据行情快照与持仓构建表格行所需档案。
 */
export function buildEtfProfile(
  code: string,
  spot: EtfSpotBrief | null,
  holdings: EtfHoldings | null
): EtfProfile {
  const name =
    spot?.name && spot.name.trim().length > 0
      ? spot.name.trim()
      : `ETF ${code}`;
  let aum = 0;
  if (spot?.totalMvYuan != null && Number.isFinite(spot.totalMvYuan)) {
    aum = spot.totalMvYuan / 1e8;
  }

  const topHoldings: HoldingItemMock[] = holdings?.items?.length
    ? toFractionWeights(holdings.items)
        .filter((i) => typeof i.weight === "number" && i.weight > 0)
        .slice(0, 5)
        .map((item) => ({
          name: item.name?.trim() || item.key,
          weight: item.weight,
        }))
    : [];

  const topSectors: SectorWeight[] =
    holdings?.sectors?.flatMap((s) => {
      const nm = typeof s?.name === "string" ? s.name.trim() : "";
      const w =
        typeof s?.weight === "number" && Number.isFinite(s.weight)
          ? s.weight
          : null;
      if (!nm || w == null || w <= 0) return [];
      return [{ name: nm, weight: w }];
    }) ?? [];

  const trackingRaw =
    spot?.trackingIndex != null && typeof spot.trackingIndex === "string"
      ? spot.trackingIndex.trim()
      : "";
  const trackingIndex = trackingRaw.length ? trackingRaw : "—";

  let listedYear = 0;
  if (
    spot?.listedYear != null &&
    Number.isFinite(spot.listedYear) &&
    spot.listedYear > 1900
  ) {
    listedYear = Math.round(spot.listedYear);
  }

  let expenseRatio = 0;
  if (
    spot?.expenseRatio != null &&
    Number.isFinite(spot.expenseRatio) &&
    spot.expenseRatio > 0
  ) {
    expenseRatio = spot.expenseRatio;
  }

  return {
    code,
    name,
    aum,
    expenseRatio,
    trackingIndex,
    listedYear,
    topSectors,
    topHoldings,
  };
}
