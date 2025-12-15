/**
 * 微信推送触发 API
 * POST /api/wechat/push
 * 由 Vercel Cron Job 触发，或手动调用
 */

import { createErrorResponse, createSuccessResponse } from "@/lib/api-error";
import { getFavoritesFromKV } from "@/lib/favorites-store";
import { initKV } from "@/lib/kv";
import { logPushSuccess } from "@/lib/logger";
import { decryptSensitiveData } from "@/lib/security";
import { sendTemplateMessage } from "@/lib/wechat";
import { handlePushFailure } from "@/lib/wechat-retry";
import { buildPushTemplateData } from "@/lib/wechat-template";
import type {
  Favorite,
  PushLog,
  PushLogStatus,
  WeChatBinding,
} from "@/types/favorites";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

// 推送去重检查
async function checkDedup(
  kv: ReturnType<typeof initKV>,
  userId: string,
  date: string,
  symbol: string
): Promise<boolean> {
  const dedupKey = `pushlog:${userId}:${date}:${symbol}`;
  const existing = await kv.get<PushLog>(dedupKey);
  return !!existing;
}

// 记录推送日志
async function logPush(
  kv: ReturnType<typeof initKV>,
  userId: string,
  date: string,
  symbol: string,
  status: PushLogStatus,
  error?: string,
  retryCount: number = 0
): Promise<void> {
  const dedupKey = `pushlog:${userId}:${date}:${symbol}`;
  const log: PushLog = {
    userId,
    contact: "", // 推送日志中不需要 contact
    sentAt: new Date().toISOString(),
    items: [], // 单个推送不需要 items 数组
    status,
    retryCount,
    error: error || undefined,
    dedupKey,
  };

  await kv.set(dedupKey, log);
}

// 获取价格数据（带超时）
async function fetchPriceDataWithTimeout(
  symbol: string,
  timeoutMs: number = 30000
): Promise<{
  symbol: string;
  name: string;
  highest: number;
  current: number;
  target80: number;
} | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(
      `${
        process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
      }/api/stock?symbol=${encodeURIComponent(symbol)}`,
      {
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      symbol: string;
      name: string;
      highest?: { price: number };
      current?: { price: number };
      target80?: { price: number };
    };

    if (!data.highest?.price || !data.current?.price || !data.target80?.price) {
      return null;
    }

    return {
      symbol: data.symbol,
      name: data.name,
      highest: data.highest.price,
      current: data.current.price,
      target80: data.target80.price,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      console.warn(`Price fetch timeout for ${symbol}`);
    } else {
      console.error(`Price fetch error for ${symbol}:`, error);
    }
    return null;
  }
}

// 发送推送消息
async function sendPushMessage(
  openId: string,
  favorite: Favorite,
  priceData: {
    symbol: string;
    name: string;
    highest: number;
    current: number;
    target80: number;
  }
): Promise<void> {
  const templateId = process.env.WECHAT_TEMPLATE_ID;
  if (!templateId) {
    throw new Error("WECHAT_TEMPLATE_ID 未配置");
  }

  // 使用统一的模板消息构建函数
  await sendTemplateMessage({
    openId,
    templateId,
    data: buildPushTemplateData(priceData),
  });
}

// POST /api/wechat/push
export async function POST(req: NextRequest) {
  try {
    // 验证安全令牌
    const pushToken = req.headers.get("x-push-token");
    const expectedToken = process.env.WECHAT_PUSH_TOKEN;

    if (!expectedToken) {
      console.error("WECHAT_PUSH_TOKEN 未配置");
      return createErrorResponse("推送服务未配置", "NOT_CONFIGURED", 500);
    }

    if (pushToken !== expectedToken) {
      return createErrorResponse("无效的推送令牌", "INVALID_TOKEN", 401);
    }

    const body = (await req.json()) as { date?: string } | null;
    const date = body?.date || new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    const kv = initKV();

    // 获取所有绑定用户
    // 使用 Vercel KV 的 keys 方法扫描所有 wechat:* 键
    const allKeys = await kv.keys("wechat:*");
    const bindings: WeChatBinding[] = [];

    for (const key of allKeys) {
      try {
        const binding = await kv.get<WeChatBinding>(key as string);
        if (binding && binding.status === "active") {
          bindings.push(binding);
        }
      } catch (error) {
        console.error(`Failed to get binding for key ${key}:`, error);
      }
    }

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    // 为每个用户处理推送
    for (const binding of bindings) {
      try {
        // 获取用户收藏
        const favorites = await getFavoritesFromKV(binding.userId);
        if (!favorites || favorites.length === 0) {
          continue;
        }

        // 解密 openId
        const openId = decryptSensitiveData(binding.openId);

        // 为每个收藏的 ETF 发送推送
        for (const favoriteItem of favorites) {
          // 检查去重
          const alreadyPushed = await checkDedup(
            kv,
            binding.userId,
            date,
            favoriteItem.symbol
          );

          if (alreadyPushed) {
            skipped++;
            continue;
          }

          // 获取价格数据（带超时）
          const priceData = await fetchPriceDataWithTimeout(
            favoriteItem.symbol,
            30000
          );

          if (!priceData) {
            // 数据获取失败，记录日志并跳过
            await logPush(
              kv,
              binding.userId,
              date,
              favoriteItem.symbol,
              "failed",
              "价格数据获取失败或超时"
            );
            failed++;
            continue;
          }

          // 构建 Favorite 对象（用于重试机制）
          const favorite: Favorite = {
            userId: binding.userId,
            symbol: favoriteItem.symbol,
            name: favoriteItem.name,
            createdAt: new Date().toISOString(),
          };

          // 发送推送
          try {
            await sendPushMessage(openId, favorite, priceData);
            await logPush(
              kv,
              binding.userId,
              date,
              favoriteItem.symbol,
              "success"
            );
            logPushSuccess(binding.userId, favoriteItem.symbol);
            sent++;
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "未知错误";
            failed++;

            // 处理失败并调度重试
            await handlePushFailure(
              binding.userId,
              openId,
              favorite,
              date,
              priceData,
              errorMessage
            );
          }
        }
      } catch (error) {
        console.error(
          `Failed to process push for user ${binding.userId}:`,
          error
        );
        failed++;
      }
    }

    return createSuccessResponse({
      sent,
      failed,
      skipped,
      total: bindings.length,
    });
  } catch (error) {
    console.error("POST /api/wechat/push error:", error);
    if (error instanceof Error) {
      return createErrorResponse(
        error.message || "推送失败",
        "INTERNAL_ERROR",
        500
      );
    }
    return createErrorResponse("未知错误", "UNKNOWN_ERROR", 500);
  }
}
