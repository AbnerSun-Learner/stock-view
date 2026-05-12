import type { IndexChartWindow, IndexPricePoint } from "@/types/indices";

function addYears(isoDate: string, deltaYears: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setFullYear(d.getFullYear() + deltaYears);
  return d.toISOString().slice(0, 10);
}

function januaryFirstUtc(isoDate: string): string {
  const y = isoDate.slice(0, 4);
  return `${y}-01-01`;
}

function maxIso(a: string, b: string): string {
  return a >= b ? a : b;
}

/** 按走势图窗口截取收盘价序列 */
export function slicePricesByChartWindow(
  sortedAsc: readonly IndexPricePoint[],
  window: IndexChartWindow,
  listingAnchorDate: string
): IndexPricePoint[] {
  if (sortedAsc.length === 0) return [];

  if (window === "ALL") return [...sortedAsc];

  const last = sortedAsc[sortedAsc.length - 1].date;

  if (window === "LISTED") {
    const cut = maxIso(listingAnchorDate.trim(), sortedAsc[0].date);
    return sortedAsc.filter((p) => p.date >= cut);
  }

  if (window === "YTD") {
    const start = januaryFirstUtc(last);
    return sortedAsc.filter((p) => p.date >= start);
  }

  const years =
    window === "1Y" ? 1 : window === "3Y" ? 3 : window === "5Y" ? 5 : 10;
  const cutoff = addYears(last, -years);
  return sortedAsc.filter((p) => p.date >= cutoff);
}

/** 截取与价格日期对齐的同序估值序列（输入需与价格为同一套日期序） */
export function sliceAlignedValuation<T extends { date: string }>(
  sortedAsc: readonly T[],
  window: IndexChartWindow,
  listingAnchorDate: string
): T[] {
  if (sortedAsc.length === 0) return [];

  if (window === "ALL") return [...sortedAsc];

  const last = sortedAsc[sortedAsc.length - 1].date;

  if (window === "LISTED") {
    const cut = maxIso(listingAnchorDate.trim(), sortedAsc[0].date);
    return sortedAsc.filter((p) => p.date >= cut);
  }

  if (window === "YTD") {
    const start = januaryFirstUtc(last);
    return sortedAsc.filter((p) => p.date >= start);
  }

  const years =
    window === "1Y" ? 1 : window === "3Y" ? 3 : window === "5Y" ? 5 : 10;
  const cutoff = addYears(last, -years);
  return sortedAsc.filter((p) => p.date >= cutoff);
}
