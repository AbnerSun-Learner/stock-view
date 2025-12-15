/**
 * 价格数据获取工具
 * 批量请求、并发控制、错误处理
 */

import type { EtfResponse } from "@/types/stock";

export interface PriceData {
  symbol: string;
  data: EtfResponse | null;
  loading: boolean;
  error: string | null;
}

export interface FetchPriceOptions {
  batchSize?: number;
  baseUrl?: string;
  timeout?: number;
}

const DEFAULT_OPTIONS: Required<FetchPriceOptions> = {
  batchSize: 5,
  baseUrl: "",
  timeout: 30000,
};

/**
 * 获取单个 ETF 的价格数据
 */
export async function fetchSinglePrice(
  symbol: string,
  options: FetchPriceOptions = {}
): Promise<PriceData> {
  const { baseUrl, timeout } = { ...DEFAULT_OPTIONS, ...options };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const resp = await fetch(
      `${baseUrl}/api/stock?symbol=${encodeURIComponent(symbol)}`,
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    if (!resp.ok) {
      const json = (await resp.json()) as { error?: string };
      throw new Error(json.error || "获取数据失败");
    }

    const json = (await resp.json()) as EtfResponse;

    return {
      symbol,
      data: json,
      loading: false,
      error: null,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "获取价格数据失败";

    // 处理超时
    if (error instanceof Error && error.name === "AbortError") {
      return {
        symbol,
        data: null,
        loading: false,
        error: "请求超时",
      };
    }

    return {
      symbol,
      data: null,
      loading: false,
      error: errorMessage,
    };
  }
}

/**
 * 批量获取价格数据（带并发控制）
 */
export async function fetchBatchPrices(
  symbols: string[],
  options: FetchPriceOptions = {},
  onProgress?: (data: PriceData) => void
): Promise<PriceData[]> {
  const { batchSize } = { ...DEFAULT_OPTIONS, ...options };

  if (symbols.length === 0) {
    return [];
  }

  const results: PriceData[] = [];

  // 分批处理
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);

    // 并发请求当前批次
    const batchResults = await Promise.all(
      batch.map((symbol) => fetchSinglePrice(symbol, options))
    );

    // 更新结果并触发进度回调
    for (const result of batchResults) {
      results.push(result);
      if (onProgress) {
        onProgress(result);
      }
    }
  }

  return results;
}

/**
 * 使用 Map 更新价格数据状态
 */
export function updatePriceDataMap(
  map: Map<string, PriceData>,
  updates: PriceData[]
): Map<string, PriceData> {
  const next = new Map(map);
  for (const update of updates) {
    next.set(update.symbol, update);
  }
  return next;
}
