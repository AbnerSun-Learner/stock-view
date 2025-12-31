"use client";

/**
 * Supabase 认证回调页面
 * 处理邮箱确认、密码重置等认证回调
 */

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import { CheckCircle, XCircle, Loader2, Lock } from "lucide-react";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "reset">("loading");
  const [message, setMessage] = useState("正在验证...");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      try {
        // 获取 URL 中的 hash 参数（Supabase 会将 token 放在 hash 中）
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const type = hashParams.get("type");

        // 如果没有 hash 参数，尝试从 query 参数获取（某些情况下）
        if (!accessToken) {
          const code = searchParams.get("code");
          if (code) {
            // 使用 code 交换 session
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) throw error;
            
            setStatus("success");
            setMessage("邮箱验证成功！正在跳转...");
            setTimeout(() => {
              router.push("/");
            }, 2000);
            return;
          }
        }

        // 如果有 access_token，说明是从邮件链接跳转过来的
        if (accessToken && refreshToken) {
          // 设置 session
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) throw error;

          // 根据 type 显示不同的消息
          if (type === "recovery") {
            // 密码重置，显示密码设置界面
            setStatus("reset");
            setMessage("请设置新密码");
          } else if (type === "signup" || type === "email") {
            setStatus("success");
            setMessage("邮箱验证成功！正在跳转...");
            setTimeout(() => {
              router.push("/");
            }, 2000);
          } else {
            setStatus("success");
            setMessage("验证成功！正在跳转...");
            setTimeout(() => {
              router.push("/");
            }, 2000);
          }
        } else {
          // 如果没有 token，可能是直接访问这个页面
          setStatus("error");
          setMessage("无效的验证链接");
          setTimeout(() => {
            router.push("/");
          }, 3000);
        }
      } catch (error: any) {
        console.error("认证回调错误:", error);
        setStatus("error");
        setMessage(error.message || "验证失败，请重试");
        setTimeout(() => {
          router.push("/");
        }, 3000);
      }
    }

    handleCallback();
  }, [router, searchParams]);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);

    if (newPassword.length < 6) {
      setResetError("密码至少需要6位字符");
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError("两次输入的密码不一致");
      return;
    }

    setResetLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setStatus("success");
      setMessage("密码重置成功！正在跳转...");
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (error: any) {
      setResetError(error.message || "密码重置失败，请重试");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-8">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="w-12 h-12 text-indigo-600 dark:text-indigo-400 animate-spin" />
              <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
                正在验证
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {message}
              </p>
            </>
          )}

          {status === "reset" && (
            <form onSubmit={handlePasswordReset} className="w-full space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold opacity-60 uppercase tracking-tighter text-left">
                  新密码
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="至少6位字符"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold opacity-60 uppercase tracking-tighter text-left">
                  确认密码
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="再次输入密码"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-mono"
                  />
                </div>
              </div>

              {resetError && (
                <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 text-sm">
                  {resetError}
                </div>
              )}

              <button
                type="submit"
                disabled={resetLoading}
                className={`w-full py-3 rounded-xl font-bold text-white transition-all ${
                  resetLoading
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30"
                }`}
              >
                {resetLoading ? "重置中..." : "重置密码"}
              </button>
            </form>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
              <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
                验证成功
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {message}
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
              <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
                验证失败
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {message}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-8">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <Loader2 className="w-12 h-12 text-indigo-600 dark:text-indigo-400 animate-spin" />
              <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
                正在加载
              </h2>
            </div>
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}

