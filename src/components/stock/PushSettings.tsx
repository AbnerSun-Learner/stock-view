/**
 * 推送设置组件（微信绑定/解绑界面）
 */

"use client";

import { getUserIdFromStorage } from "@/lib/user-id";
import { useEffect, useState } from "react";

interface PushSettingsProps {
  onBindSuccess?: () => void;
}

export function PushSettings({ onBindSuccess }: PushSettingsProps) {
  const [isBound, setIsBound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [binding, setBinding] = useState(false);

  // 检查绑定状态
  useEffect(() => {
    async function checkBindingStatus() {
      try {
        const userId = getUserIdFromStorage();
        if (!userId) {
          setLoading(false);
          return;
        }

        // 调用 API 检查绑定状态
        try {
          const response = await fetch(`/api/wechat/bind?userId=${userId}`);
          const result = await response.json();
          if (result.ok && result.data?.bound) {
            setIsBound(true);
          }
        } catch (error) {
          // API 调用失败，假设未绑定
          console.error("Failed to check binding status:", error);
        }
      } catch (error) {
        console.error("Failed to check binding status:", error);
      } finally {
        setLoading(false);
      }
    }

    checkBindingStatus();
  }, []);

  // 处理微信绑定
  const handleBind = async () => {
    const userId = getUserIdFromStorage();
    if (!userId) {
      alert("请先完成身份识别");
      return;
    }

    const contact = localStorage.getItem("stock_view_user_contact");
    const contactType = localStorage.getItem("stock_view_user_contact_type") as
      | "phone"
      | "email"
      | null;

    if (!contact || !contactType) {
      alert("请先完成身份识别（填写手机号或邮箱）");
      return;
    }

    setBinding(true);

    try {
      // 构建微信 OAuth2 授权 URL
      // 注意：需要在环境变量中配置 NEXT_PUBLIC_WECHAT_APP_ID
      const appId = process.env.NEXT_PUBLIC_WECHAT_APP_ID;
      if (!appId) {
        alert("微信配置未完成，请联系管理员");
        setBinding(false);
        return;
      }

      const redirectUri = encodeURIComponent(
        `${window.location.origin}/api/wechat/callback`
      );
      const state = encodeURIComponent(
        JSON.stringify({ userId, contact, contactType })
      );
      const scope = "snsapi_base"; // 静默授权，只获取 openId

      const authUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${appId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}#wechat_redirect`;

      // 在新窗口打开授权页面
      const authWindow = window.open(
        authUrl,
        "wechat_auth",
        "width=500,height=600"
      );

      // 监听授权完成消息
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === "wechat_bind_success") {
          setIsBound(true);
          if (onBindSuccess) {
            onBindSuccess();
          }
          window.removeEventListener("message", handleMessage);
          if (authWindow) {
            authWindow.close();
          }
        }
      };

      window.addEventListener("message", handleMessage);
    } catch (error) {
      console.error("Failed to initiate WeChat binding:", error);
      alert("绑定失败，请稍后重试");
      setBinding(false);
    }
  };

  // 处理解绑
  const handleUnbind = async () => {
    if (!confirm("确定要解绑微信吗？解绑后将不再接收推送消息。")) {
      return;
    }

    const userId = getUserIdFromStorage();
    if (!userId) {
      return;
    }

    try {
      const response = await fetch("/api/wechat/bind", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const result = await response.json();

      if (result.ok) {
        setIsBound(false);
        alert("解绑成功");
      } else {
        alert(`解绑失败: ${result.error || "未知错误"}`);
      }
    } catch (error) {
      console.error("Failed to unbind WeChat:", error);
      alert("解绑失败，请稍后重试");
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
        <div className="text-sm text-slate-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">微信推送设置</h3>
      </div>

      <p className="mb-4 text-xs text-slate-500">
        绑定微信后，每个交易日收盘后（15:00-16:00）将自动推送您收藏的 ETF
        最新价格信息
      </p>

      {isBound ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-emerald-50 p-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-emerald-700">
                ✓ 已绑定微信
              </span>
            </div>
          </div>
          <button
            onClick={handleUnbind}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            解绑微信
          </button>
        </div>
      ) : (
        <button
          onClick={handleBind}
          disabled={binding}
          className="w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
        >
          {binding ? "正在跳转..." : "绑定微信"}
        </button>
      )}
    </div>
  );
}
