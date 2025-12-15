/**
 * Vercel KV 客户端工具
 */

import { kv } from "@vercel/kv";

/**
 * 检查 Vercel KV 环境变量是否配置
 */
export function checkKVConfig(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

/**
 * 初始化并验证 Vercel KV 配置
 * 如果未配置，抛出错误
 */
export function initKV(): typeof kv {
  if (!checkKVConfig()) {
    throw new Error(
      "Vercel KV 未配置。请设置环境变量 KV_REST_API_URL 和 KV_REST_API_TOKEN"
    );
  }
  return kv;
}

/**
 * 获取 KV 客户端实例
 * 如果环境变量未配置，返回 null
 */
export function getKV() {
  if (!checkKVConfig()) {
    return null;
  }
  return kv;
}

/**
 * 安全执行 KV 操作
 * 如果 KV 未配置，返回默认值
 */
export async function safeKVOperation<T>(
  operation: (kv: typeof import("@vercel/kv").kv) => Promise<T>,
  defaultValue: T
): Promise<T> {
  const kvInstance = getKV();
  if (!kvInstance) {
    console.warn("Vercel KV not configured, returning default value");
    return defaultValue;
  }
  try {
    return await operation(kvInstance);
  } catch (error) {
    console.error("KV operation failed:", error);
    throw error;
  }
}
