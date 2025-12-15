/**
 * 微信 OAuth2 回调处理
 * GET /api/wechat/callback?code=xxx&state=xxx
 */

import { initKV } from "@/lib/kv";
import { encryptSensitiveData, maskContact } from "@/lib/security";
import { getWeChatUserInfo } from "@/lib/wechat";
import type { WeChatBinding } from "@/types/favorites";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

// GET /api/wechat/callback
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code) {
      return new Response(
        `
        <!DOCTYPE html>
        <html>
          <head><title>绑定失败</title></head>
          <body>
            <h1>绑定失败</h1>
            <p>缺少授权码，请重试。</p>
            <script>setTimeout(() => window.close(), 3000);</script>
          </body>
        </html>
        `,
        {
          headers: { "Content-Type": "text/html; charset=utf-8" },
          status: 400,
        }
      );
    }

    if (!state) {
      return new Response(
        `
        <!DOCTYPE html>
        <html>
          <head><title>绑定失败</title></head>
          <body>
            <h1>绑定失败</h1>
            <p>缺少状态参数，请重试。</p>
            <script>setTimeout(() => window.close(), 3000);</script>
          </body>
        </html>
        `,
        {
          headers: { "Content-Type": "text/html; charset=utf-8" },
          status: 400,
        }
      );
    }

    // 解析 state 参数
    let stateData: { userId: string; contact: string; contactType: string };
    try {
      stateData = JSON.parse(decodeURIComponent(state));
    } catch {
      return new Response(
        `
        <!DOCTYPE html>
        <html>
          <head><title>绑定失败</title></head>
          <body>
            <h1>绑定失败</h1>
            <p>状态参数无效，请重试。</p>
            <script>setTimeout(() => window.close(), 3000);</script>
          </body>
        </html>
        `,
        {
          headers: { "Content-Type": "text/html; charset=utf-8" },
          status: 400,
        }
      );
    }

    const { userId, contact, contactType } = stateData;

    // 使用 code 换取 openId
    let userInfo;
    try {
      userInfo = await getWeChatUserInfo(code);
    } catch (error) {
      return new Response(
        `
        <!DOCTYPE html>
        <html>
          <head><title>绑定失败</title></head>
          <body>
            <h1>绑定失败</h1>
            <p>获取微信用户信息失败，请重试。</p>
            <script>setTimeout(() => window.close(), 3000);</script>
          </body>
        </html>
        `,
        {
          headers: { "Content-Type": "text/html; charset=utf-8" },
          status: 500,
        }
      );
    }

    const kv = initKV();

    // 加密存储 openId
    const encryptedOpenId = encryptSensitiveData(userInfo.openId);

    // 存储绑定信息
    const binding: WeChatBinding = {
      userId,
      contact,
      openId: encryptedOpenId,
      unionId: userInfo.unionId
        ? encryptSensitiveData(userInfo.unionId)
        : undefined,
      boundAt: new Date().toISOString(),
      status: "active",
    };

    await kv.set(`wechat:${userId}`, binding);

    // 日志脱敏
    console.log(
      `WeChat binding created for user ${userId}, contact: ${maskContact(
        contact,
        contactType as "phone" | "email"
      )}`
    );

    // 返回成功页面，并通知父窗口
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head><title>绑定成功</title></head>
        <body>
          <h1>绑定成功！</h1>
          <p>微信账号已成功绑定，您将开始接收推送消息。</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'wechat_bind_success' }, '*');
              setTimeout(() => window.close(), 2000);
            } else {
              setTimeout(() => window.location.href = '/favorites', 2000);
            }
          </script>
        </body>
      </html>
      `,
      {
        headers: { "Content-Type": "text/html; charset=utf-8" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("GET /api/wechat/callback error:", error);
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head><title>绑定失败</title></head>
        <body>
          <h1>绑定失败</h1>
          <p>发生错误，请稍后重试。</p>
          <script>setTimeout(() => window.close(), 3000);</script>
        </body>
      </html>
      `,
      {
        headers: { "Content-Type": "text/html; charset=utf-8" },
        status: 500,
      }
    );
  }
}
