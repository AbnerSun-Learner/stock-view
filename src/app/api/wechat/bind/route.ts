/**
 * 微信绑定/解绑 API 路由
 * POST /api/wechat/bind - 绑定微信
 * DELETE /api/wechat/bind - 解绑微信
 * GET /api/wechat/bind?userId=xxx - 查询绑定状态
 */

import { createErrorResponse, createSuccessResponse } from "@/lib/api-error";
import { initKV } from "@/lib/kv";
import { logApiError } from "@/lib/logger";
import { encryptSensitiveData, maskContact, maskOpenId } from "@/lib/security";
import { isValidUserId } from "@/lib/user-id";
import { getWeChatUserInfo } from "@/lib/wechat";
import type { WeChatBinding } from "@/types/favorites";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

// GET /api/wechat/bind - 查询绑定状态
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

    const kv = initKV();
    const binding = await kv.get<WeChatBinding>(`wechat:${userId}`);

    return createSuccessResponse({
      bound: !!binding && binding.status === "active",
    });
  } catch (error) {
    console.error("GET /api/wechat/bind error:", error);
    if (error instanceof Error) {
      return createErrorResponse(
        error.message || "查询绑定状态失败",
        "INTERNAL_ERROR",
        500
      );
    }
    return createErrorResponse("未知错误", "UNKNOWN_ERROR", 500);
  }
}

// POST /api/wechat/bind
export async function POST(req: NextRequest) {
  let userId: string | undefined;
  try {
    const body = (await req.json()) as {
      code: string;
      userId: string;
      contact: string;
      contactType: "phone" | "email";
    };

    const { code, userId: bodyUserId, contact, contactType } = body;
    userId = bodyUserId;

    // 验证必需参数
    if (!code || !userId || !contact || !contactType) {
      return createErrorResponse("缺少必需参数", "MISSING_PARAMS", 400);
    }

    if (!isValidUserId(userId)) {
      return createErrorResponse("无效的 userId 格式", "INVALID_USER_ID", 400);
    }

    // 使用 code 换取 openId
    let userInfo;
    try {
      userInfo = await getWeChatUserInfo(code);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "invalid_code") {
          return createErrorResponse("无效的授权码", "invalid_code", 400);
        }
        if (error.message === "auth_failed") {
          return createErrorResponse("微信授权失败", "auth_failed", 500);
        }
      }
      return createErrorResponse("获取微信用户信息失败", "auth_failed", 500);
    }

    const kv = initKV();

    // 加密存储 openId
    const encryptedOpenId = encryptSensitiveData(userInfo.openId);

    // 存储绑定信息
    const binding: WeChatBinding = {
      userId: userId!,
      contact,
      openId: encryptedOpenId, // 存储加密后的 openId
      unionId: userInfo.unionId
        ? encryptSensitiveData(userInfo.unionId)
        : undefined,
      boundAt: new Date().toISOString(),
      status: "active",
    };

    await kv.set(`wechat:${userId!}`, binding);

    // 日志脱敏
    console.log(
      `WeChat binding created for user ${userId!}, contact: ${maskContact(
        contact,
        contactType
      )}`
    );

    return createSuccessResponse({
      openId: maskOpenId(userInfo.openId), // 返回脱敏的 openId 用于确认
    });
  } catch (error) {
    logApiError("POST /api/wechat/bind", error, { userId });
    if (error instanceof Error) {
      return createErrorResponse(
        error.message || "绑定微信失败",
        "INTERNAL_ERROR",
        500
      );
    }
    return createErrorResponse("未知错误", "UNKNOWN_ERROR", 500);
  }
}

// DELETE /api/wechat/bind
export async function DELETE(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      userId: string;
    };

    const { userId } = body;

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

    const kv = initKV();

    // 删除绑定记录
    await kv.del(`wechat:${userId}`);

    console.log(`WeChat binding removed for user ${userId}`);

    return createSuccessResponse();
  } catch (error) {
    console.error("DELETE /api/wechat/bind error:", error);
    if (error instanceof Error) {
      return createErrorResponse(
        error.message || "解绑微信失败",
        "INTERNAL_ERROR",
        500
      );
    }
    return createErrorResponse("未知错误", "UNKNOWN_ERROR", 500);
  }
}
