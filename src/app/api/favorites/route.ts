/**
 * 收藏 API 路由
 * GET: 获取用户的收藏列表
 * POST: 同步收藏记录到服务端
 */

import { createErrorResponse, createSuccessResponse } from "@/lib/api-error";
import { getFavoritesFromKV, syncFavoritesToKV } from "@/lib/favorites-store";
import { initKV } from "@/lib/kv";
import { isValidUserId } from "@/lib/user-id";
import type { UserIdentity } from "@/types/favorites";
import type { FavoriteItem } from "@/types/stock";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

// GET /api/favorites?userId=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

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

    initKV(); // 初始化 KV（如果未配置会抛出错误）
    const favorites = await getFavoritesFromKV(userId);

    return createSuccessResponse({ favorites });
  } catch (error) {
    console.error("GET /api/favorites error:", error);
    if (error instanceof Error) {
      return createErrorResponse(
        error.message || "获取收藏列表失败",
        "INTERNAL_ERROR",
        500
      );
    }
    return createErrorResponse("未知错误", "UNKNOWN_ERROR", 500);
  }
}

// POST /api/favorites
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      userId: string;
      contact: string;
      contactType: "phone" | "email";
      favorites: Array<{ symbol: string; name: string | null }>;
    };

    const { userId, contact, contactType, favorites } = body;

    // 验证必需参数
    if (!userId || !contact || !contactType || !favorites) {
      return createErrorResponse("缺少必需参数", "MISSING_PARAMS", 400);
    }

    if (!isValidUserId(userId)) {
      return createErrorResponse("无效的 userId 格式", "INVALID_USER_ID", 400);
    }

    // 验证收藏数量
    if (favorites.length > 50) {
      return createErrorResponse("收藏数量超过上限 50", "EXCEED_LIMIT", 400);
    }

    // 验证 symbol 格式
    const symbolRegex = /^\d{6}(\.(SZ|SH))?$/;
    const invalidSymbols = favorites.filter((f) => !symbolRegex.test(f.symbol));
    if (invalidSymbols.length > 0) {
      return createErrorResponse(
        `无效的 ETF 代码格式: ${invalidSymbols
          .map((f) => f.symbol)
          .join(", ")}`,
        "INVALID_SYMBOL",
        400
      );
    }

    const kv = initKV();

    // 创建或更新用户标识
    const userIdentity: UserIdentity = {
      userId,
      contact,
      contactType,
      createdAt: new Date().toISOString(),
    };
    await kv.set(`user:${userId}`, userIdentity);

    // 同步收藏记录
    const favoriteItems: FavoriteItem[] = favorites.map((f) => ({
      symbol: f.symbol,
      name: f.name,
    }));
    const result = await syncFavoritesToKV(userId, favoriteItems);

    return createSuccessResponse({
      synced: result.synced,
      removed: result.removed,
    });
  } catch (error) {
    console.error("POST /api/favorites error:", error);
    if (error instanceof Error) {
      return createErrorResponse(
        error.message || "同步收藏失败",
        "INTERNAL_ERROR",
        500
      );
    }
    return createErrorResponse("未知错误", "UNKNOWN_ERROR", 500);
  }
}
