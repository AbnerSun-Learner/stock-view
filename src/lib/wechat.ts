/**
 * 微信 API 客户端工具
 * access_token 获取与缓存、模板消息发送
 */

interface AccessTokenResponse {
  access_token: string;
  expires_in: number;
}

interface AccessTokenCache {
  token: string;
  expiresAt: number;
}

// 内存缓存 access_token（单例模式）
let tokenCache: AccessTokenCache | null = null;

/**
 * 获取微信 access_token（带缓存）
 * 有效期 2 小时，自动刷新
 */
export async function getWeChatAccessToken(): Promise<string> {
  const appId = process.env.WECHAT_APP_ID;
  const appSecret = process.env.WECHAT_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error(
      "微信配置未设置。请设置环境变量 WECHAT_APP_ID 和 WECHAT_APP_SECRET"
    );
  }

  // 检查缓存是否有效（提前 5 分钟刷新）
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 5 * 60 * 1000) {
    return tokenCache.token;
  }

  // 获取新的 access_token
  try {
    const response = await fetch(
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`
    );

    if (!response.ok) {
      throw new Error(`获取 access_token 失败: ${response.statusText}`);
    }

    const data = (await response.json()) as AccessTokenResponse & {
      errcode?: number;
      errmsg?: string;
    };

    if (data.errcode) {
      throw new Error(
        `微信 API 错误: ${data.errcode} - ${data.errmsg || "未知错误"}`
      );
    }

    // 更新缓存
    tokenCache = {
      token: data.access_token,
      expiresAt: now + (data.expires_in - 300) * 1000, // 提前 5 分钟过期
    };

    return data.access_token;
  } catch (error) {
    console.error("Failed to get WeChat access token:", error);
    throw error;
  }
}

/**
 * 使用 code 换取 openId 和 unionId
 */
export async function getWeChatUserInfo(
  code: string
): Promise<{ openId: string; unionId?: string }> {
  const appId = process.env.WECHAT_APP_ID;
  const appSecret = process.env.WECHAT_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error(
      "微信配置未设置。请设置环境变量 WECHAT_APP_ID 和 WECHAT_APP_SECRET"
    );
  }

  try {
    const response = await fetch(
      `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appId}&secret=${appSecret}&code=${code}&grant_type=authorization_code`
    );

    if (!response.ok) {
      throw new Error(`获取用户信息失败: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
      refresh_token?: string;
      openid: string;
      unionid?: string;
      scope?: string;
      errcode?: number;
      errmsg?: string;
    };

    if (data.errcode) {
      if (data.errcode === 40029) {
        throw new Error("invalid_code");
      }
      throw new Error(
        `微信 API 错误: ${data.errcode} - ${data.errmsg || "未知错误"}`
      );
    }

    return {
      openId: data.openid,
      unionId: data.unionid,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_code") {
      throw error;
    }
    console.error("Failed to get WeChat user info:", error);
    throw new Error("auth_failed");
  }
}

/**
 * 发送模板消息
 */
export async function sendTemplateMessage(params: {
  openId: string;
  templateId: string;
  data: Record<string, { value: string; color?: string }>;
  url?: string;
}): Promise<void> {
  const accessToken = await getWeChatAccessToken();

  try {
    const response = await fetch(
      `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${accessToken}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          touser: params.openId,
          template_id: params.templateId,
          url: params.url,
          data: params.data,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`发送模板消息失败: ${response.statusText}`);
    }

    const result = (await response.json()) as {
      errcode: number;
      errmsg: string;
    };

    if (result.errcode !== 0) {
      // 处理频率限制
      if (result.errcode === 45009) {
        throw new Error("rate_limited");
      }
      throw new Error(`微信 API 错误: ${result.errcode} - ${result.errmsg}`);
    }
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "rate_limited" || error.message === "invalid_code")
    ) {
      throw error;
    }
    console.error("Failed to send template message:", error);
    throw new Error("发送模板消息失败");
  }
}

// 加密和脱敏函数已移至 src/lib/security.ts
// 保持向后兼容的导出
export {
  decryptSensitiveData,
  encryptSensitiveData,
  maskOpenId,
} from "./security";
