/**
 * 微信推送重试 API
 * POST /api/wechat/retry
 * 用于执行重试任务（可由定时任务或手动触发）
 */

import { createErrorResponse, createSuccessResponse } from "@/lib/api-error";
import { initKV } from "@/lib/kv";
import { executeRetry } from "@/lib/wechat-retry";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

// POST /api/wechat/retry
export async function POST(req: NextRequest) {
  try {
    // 验证安全令牌
    const pushToken = req.headers.get("x-push-token");
    const expectedToken = process.env.WECHAT_PUSH_TOKEN;

    if (!expectedToken) {
      return createErrorResponse("推送服务未配置", "NOT_CONFIGURED", 500);
    }

    if (pushToken !== expectedToken) {
      return createErrorResponse("无效的推送令牌", "INVALID_TOKEN", 401);
    }

    const kv = initKV();

    // 获取所有待重试的任务
    const retryKeys = await kv.keys("retry:*");
    let executed = 0;
    let success = 0;
    let failed = 0;

    for (const key of retryKeys) {
      try {
        const keyStr = key as string;
        // 解析 key: retry:userId:date:symbol:retryCount
        const parts = keyStr.split(":");
        if (parts.length !== 5) {
          continue;
        }

        const [, userId, date, symbol, retryCountStr] = parts;
        const retryCount = parseInt(retryCountStr, 10);

        const result = await executeRetry(userId, date, symbol, retryCount);
        executed++;

        if (result) {
          success++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`Failed to execute retry for key ${key}:`, error);
        failed++;
      }
    }

    return createSuccessResponse({
      executed,
      success,
      failed,
    });
  } catch (error) {
    console.error("POST /api/wechat/retry error:", error);
    if (error instanceof Error) {
      return createErrorResponse(
        error.message || "重试失败",
        "INTERNAL_ERROR",
        500
      );
    }
    return createErrorResponse("未知错误", "UNKNOWN_ERROR", 500);
  }
}
