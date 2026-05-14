import type { IndexCategory, SupportedIndexMeta } from "@/types/indices";
import supportedIndices from "../../../data/indices/supported-indices.json";

const VALID_CATEGORIES = new Set<IndexCategory>([
  "宽基",
  "行业",
  "主题",
  "跨境",
]);

function isSupportedIndexMeta(value: unknown): value is SupportedIndexMeta {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.code === "string" &&
    typeof row.name === "string" &&
    VALID_CATEGORIES.has(row.category as IndexCategory) &&
    typeof row.displayOrder === "number" &&
    Number.isFinite(row.displayOrder)
  );
}

export const SUPPORTED_INDICES: SupportedIndexMeta[] =
  supportedIndices.filter(isSupportedIndexMeta);

export const LIST_VISIBLE_CATEGORIES = new Set<IndexCategory>(["宽基", "行业"]);

export const SUPPORTED_INDEX_CODES = new Set(
  SUPPORTED_INDICES.map((item) => item.code)
);

export function getSupportedIndexMeta(code: string): SupportedIndexMeta | null {
  return SUPPORTED_INDICES.find((item) => item.code === code) ?? null;
}

export function getVisibleIndexMetas(): SupportedIndexMeta[] {
  return SUPPORTED_INDICES.filter((meta) =>
    LIST_VISIBLE_CATEGORIES.has(meta.category)
  );
}
