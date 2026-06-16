import { FALLBACK_ETF_POOL } from "@/lib/etfs/fallback-etf-pool";
import {
  getSupportedIndexMeta,
  SUPPORTED_INDICES,
} from "@/lib/indices/supported-indices";
import type { EtfCategory, EtfPoolItem, EtfPoolSection } from "@/types/etf";
import type { IndexDetailRecord, TrackingEtfRow } from "@/types/indices";

const CATEGORY_ORDER: EtfCategory[] = [
  "宽基",
  "行业",
  "跨境",
  "商品",
  "债券",
  "货币",
];

const DIRECTION_ORDER: Record<string, number> = {
  大盘: 10,
  中盘: 20,
  成长: 30,
  科技: 40,
  半导体: 100,
  AI: 110,
  新能源: 120,
  医药: 130,
  医疗: 140,
  消费: 150,
  券商: 160,
  银行: 170,
  军工: 180,
  有色: 190,
  传媒: 200,
  机器人: 210,
  美股: 300,
  港股: 310,
};

const INDEX_NAME_TO_DIRECTION: Array<[RegExp, string]> = [
  [/沪深300|上证50/, "大盘"],
  [/中证500/, "中盘"],
  [/创业板/, "成长"],
  [/科创|科技/, "科技"],
  [/半导体|芯片/, "半导体"],
  [/人工智能|AI/i, "AI"],
  [/新能源|光伏|新能车/, "新能源"],
  [/医药|创新药/, "医药"],
  [/医疗/, "医疗"],
  [/食品|消费/, "消费"],
  [/证券|券商/, "券商"],
  [/银行/, "银行"],
  [/军工/, "军工"],
  [/有色/, "有色"],
  [/传媒/, "传媒"],
  [/纳指|标普|美股/, "美股"],
  [/恒生|中概|港股/, "港股"],
];

export function buildEtfPoolFromIndexDetails(
  details: readonly IndexDetailRecord[]
): EtfPoolItem[] {
  const rows = details.flatMap((detail) =>
    detail.etfs.map((etf) => mapTrackingEtfToPoolItem(etf, detail))
  );
  return mergeEtfPool(rows);
}

export function getFallbackEtfPool(): EtfPoolItem[] {
  return mergeEtfPool([]);
}

export function mergeEtfPool(rows: readonly EtfPoolItem[]): EtfPoolItem[] {
  const byCode = new Map<string, EtfPoolItem>();

  for (const row of rows) {
    const code = normalizeEtfCode(row.etfCode);
    if (!code) continue;
    byCode.set(code, { ...row, etfCode: code });
  }

  for (const fallback of FALLBACK_ETF_POOL) {
    if (byCode.has(fallback.etfCode)) continue;

    byCode.set(fallback.etfCode, {
      etfCode: fallback.etfCode,
      etfName: fallback.etfName,
      category: fallback.category,
      direction: fallback.direction,
      source: "保底清单",
      trackingIndexCode: fallback.trackingIndexCode,
      trackingIndexName: fallback.trackingIndexName,
      aumYi: fallback.aumYi ?? null,
      avgDailyTurnoverYi: fallback.avgDailyTurnoverYi ?? null,
      premiumDiscount: fallback.premiumDiscount ?? null,
      expenseRatio: fallback.expenseRatio ?? null,
    });
  }

  return Array.from(byCode.values()).sort(compareEtfPoolItems);
}

export function groupEtfPoolByCategory(
  items: readonly EtfPoolItem[]
): EtfPoolSection[] {
  return CATEGORY_ORDER.flatMap((category) => {
    const rows = items
      .filter((item) => item.category === category)
      .sort(compareEtfPoolItems);
    return rows.length ? [{ category, items: rows }] : [];
  });
}

export function findFallbackEtf(code: string): EtfPoolItem | null {
  const normalized = normalizeEtfCode(code);
  if (!normalized) return null;

  return (
    getFallbackEtfPool().find((item) => item.etfCode === normalized) ?? null
  );
}

function mapTrackingEtfToPoolItem(
  etf: TrackingEtfRow,
  detail: IndexDetailRecord
): EtfPoolItem {
  const fallback = FALLBACK_ETF_POOL.find((item) => item.etfCode === etf.code);
  const supportedMeta = getSupportedIndexMeta(detail.code);

  return {
    etfCode: etf.code,
    etfName: etf.name,
    category:
      fallback?.category ?? mapIndexCategoryToEtfCategory(detail.category),
    direction:
      fallback?.direction ??
      inferDirection(etf.name, detail.name, supportedMeta?.name ?? ""),
    source: "行情中心",
    trackingIndexCode: detail.code,
    trackingIndexName: detail.name,
    aumYi: etf.aumYi,
    avgDailyTurnoverYi: etf.avgDailyTurnoverYi,
    premiumDiscount: etf.premiumDiscount,
    expenseRatio: etf.expenseRatio,
  };
}

function normalizeEtfCode(code: string): string | null {
  const matched = code.trim().match(/\d{6}/);
  return matched ? matched[0] : null;
}

function mapIndexCategoryToEtfCategory(category: string): EtfCategory {
  if (category === "宽基") return "宽基";
  if (category === "跨境") return "跨境";
  return "行业";
}

function inferDirection(...names: string[]): string {
  const text = names.filter(Boolean).join(" ");
  for (const [pattern, direction] of INDEX_NAME_TO_DIRECTION) {
    if (pattern.test(text)) return direction;
  }
  return "其他";
}

function compareEtfPoolItems(a: EtfPoolItem, b: EtfPoolItem): number {
  const categoryDelta =
    CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
  if (categoryDelta !== 0) return categoryDelta;

  const directionDelta =
    (DIRECTION_ORDER[a.direction] ?? 999) -
    (DIRECTION_ORDER[b.direction] ?? 999);
  if (directionDelta !== 0) return directionDelta;

  const amountA = a.avgDailyTurnoverYi ?? -1;
  const amountB = b.avgDailyTurnoverYi ?? -1;
  if (amountA !== amountB) return amountB - amountA;

  const aumA = a.aumYi ?? -1;
  const aumB = b.aumYi ?? -1;
  if (aumA !== aumB) return aumB - aumA;

  return a.etfCode.localeCompare(b.etfCode);
}

export function getFallbackTrackingIndexCodes(): string[] {
  const codes = new Set<string>();
  for (const item of FALLBACK_ETF_POOL) {
    if (item.trackingIndexCode) codes.add(item.trackingIndexCode);
  }
  for (const meta of SUPPORTED_INDICES) {
    if (meta.category === "宽基" || meta.category === "行业")
      codes.add(meta.code);
  }
  return Array.from(codes);
}
