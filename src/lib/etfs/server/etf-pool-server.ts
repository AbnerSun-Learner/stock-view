import {
  buildEtfPoolFromIndexDetails,
  getFallbackEtfPool,
} from "@/lib/etfs/etf-pool";
import { getIndexDetail } from "@/lib/indices/server/fetch-index-data";
import { getVisibleIndexMetas } from "@/lib/indices/supported-indices";
import type { EtfPoolItem } from "@/types/etf";

export async function getMarketCenterEtfPool(): Promise<EtfPoolItem[]> {
  const details = await Promise.all(
    getVisibleIndexMetas().map((meta) => getIndexDetail(meta.code))
  );
  const validDetails = details.filter((detail) => detail !== null);
  if (validDetails.length === 0) return getFallbackEtfPool();
  return buildEtfPoolFromIndexDetails(validDetails);
}
