/**
 * 删除收藏 API 路由
 * DELETE /api/favorites/:symbol?userId=xxx
 */

import { createErrorResponse, createSuccessResponse } from "@/lib/api-error";
import { initKV } from "@/lib/kv";
import { isValidUserId } from "@/lib/user-id";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const { symbol } = await params;

    if (!userId) {
      return createErrorResponse(
        "缺少必需参数: userId",
        "MISSING_USER_ID",
        400
      );
    }

    if (!isValidUserId(userId)) {
      return createErrorResponse("无效的 userId 格式", "INVALID_USER_ID", 400);
    }

    if (!symbol) {
      return createErrorResponse("缺少必需参数: symbol", "MISSING_SYMBOL", 400);
    }

    const kv = initKV();

    // 删除收藏记录
    const key = `favorite:${userId}:${symbol}`;
    await kv.del(key);

    return createSuccessResponse();
  } catch (error) {
    console.error("DELETE /api/favorites/:symbol error:", error);
    if (error instanceof Error) {
      return createErrorResponse(
        error.message || "删除收藏失败",
        "INTERNAL_ERROR",
        500
      );
    }
    return createErrorResponse("未知错误", "UNKNOWN_ERROR", 500);
  }
}
