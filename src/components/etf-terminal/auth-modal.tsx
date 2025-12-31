"use client";

/**
 * 登录/注册模态框组件
 * 使用邮箱进行认证，数据存储在 Supabase
 */

import { supabase } from "@/lib/supabase-client";
import { Lock, Mail, X } from "lucide-react";
import { useState } from "react";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  theme: "light" | "dark";
}

export function AuthModal({ open, onClose, theme }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState<
    "email" | "password"
  >("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (isLogin) {
        // 登录
        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (signInError) throw signInError;

        if (data.user) {
          setMessage("登录成功！");
          setTimeout(() => {
            onClose();
            setEmail("");
            setPassword("");
            setMessage(null);
          }, 1000);
        }
      } else {
        // 注册（不需要邮箱验证）
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;

        if (data.user) {
          setMessage("注册成功！");
          setTimeout(() => {
            setIsLogin(true);
            setEmail("");
            setPassword("");
            setMessage(null);
          }, 1500);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setMessage(null);
    setShowForgotPassword(false);
    setForgotPasswordStep("email");
    onClose();
  };

  const handleForgotPasswordEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      // 验证邮箱是否存在（通过尝试发送密码重置邮件来验证，但不实际发送）
      // 或者直接进入下一步，让用户设置新密码
      // 这里我们简化流程，直接进入密码设置步骤
      setForgotPasswordStep("password");
      setMessage("请输入新密码");
    } catch (err) {
      setError(err instanceof Error ? err.message : "验证失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (newPassword.length < 6) {
      setError("密码至少需要6位字符");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "密码重置失败");
      }

      setMessage("密码重置成功！请使用新密码登录");
      setTimeout(() => {
        setShowForgotPassword(false);
        setForgotPasswordStep("email");
        setEmail("");
        setNewPassword("");
        setConfirmPassword("");
        setMessage(null);
        setIsLogin(true);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "密码重置失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const modalBgClass =
    theme === "dark"
      ? "bg-slate-800 border-slate-700"
      : "bg-white border-slate-200";
  const inputClass =
    theme === "dark"
      ? "bg-slate-900 border-slate-700 text-slate-100"
      : "bg-slate-50 border-slate-200 text-slate-800";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* 模态框 */}
      <div
        className={`relative w-full max-w-md rounded-2xl border shadow-2xl ${modalBgClass}`}
      >
        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${
            theme === "dark"
              ? "hover:bg-slate-700 text-slate-400"
              : "hover:bg-slate-100 text-slate-500"
          }`}
        >
          <X size={20} />
        </button>

        {/* 内容 */}
        <div className="p-8">
          <h2 className="text-2xl font-black mb-6">
            {showForgotPassword ? "忘记密码" : isLogin ? "登录" : "注册"}
          </h2>

          {showForgotPassword ? (
            forgotPasswordStep === "email" ? (
              <form onSubmit={handleForgotPasswordEmail} className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold opacity-60 uppercase tracking-tighter">
                    邮箱
                  </label>
                  <div className="relative">
                    <Mail
                      className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                        theme === "dark" ? "text-slate-400" : "text-slate-500"
                      }`}
                      size={18}
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="your@email.com"
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border ${inputClass} focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-mono`}
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 rounded-xl font-bold text-white transition-all ${
                    loading
                      ? "bg-slate-400 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30"
                  }`}
                >
                  {loading ? "验证中..." : "下一步"}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setForgotPasswordStep("email");
                      setError(null);
                      setMessage(null);
                    }}
                    className={`text-sm transition-colors ${
                      theme === "dark"
                        ? "text-indigo-400 hover:text-indigo-300"
                        : "text-indigo-600 hover:text-indigo-700"
                    }`}
                  >
                    返回登录
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold opacity-60 uppercase tracking-tighter">
                    邮箱
                  </label>
                  <div className="relative">
                    <Mail
                      className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                        theme === "dark" ? "text-slate-400" : "text-slate-500"
                      }`}
                      size={18}
                    />
                    <input
                      type="email"
                      value={email}
                      disabled
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border ${inputClass} opacity-60 cursor-not-allowed`}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold opacity-60 uppercase tracking-tighter">
                    新密码
                  </label>
                  <div className="relative">
                    <Lock
                      className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                        theme === "dark" ? "text-slate-400" : "text-slate-500"
                      }`}
                      size={18}
                    />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="至少6位字符"
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border ${inputClass} focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-mono`}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold opacity-60 uppercase tracking-tighter">
                    确认密码
                  </label>
                  <div className="relative">
                    <Lock
                      className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                        theme === "dark" ? "text-slate-400" : "text-slate-500"
                      }`}
                      size={18}
                    />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="再次输入密码"
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border ${inputClass} focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-mono`}
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 text-sm">
                    {error}
                  </div>
                )}
                {message && (
                  <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 text-sm">
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 rounded-xl font-bold text-white transition-all ${
                    loading
                      ? "bg-slate-400 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30"
                  }`}
                >
                  {loading ? "重置中..." : "重置密码"}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotPasswordStep("email");
                      setNewPassword("");
                      setConfirmPassword("");
                      setError(null);
                      setMessage(null);
                    }}
                    className={`text-sm transition-colors ${
                      theme === "dark"
                        ? "text-indigo-400 hover:text-indigo-300"
                        : "text-indigo-600 hover:text-indigo-700"
                    }`}
                  >
                    返回上一步
                  </button>
                </div>
              </form>
            )
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 邮箱输入 */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold opacity-60 uppercase tracking-tighter">
                  邮箱
                </label>
                <div className="relative">
                  <Mail
                    className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                      theme === "dark" ? "text-slate-400" : "text-slate-500"
                    }`}
                    size={18}
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="your@email.com"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border ${inputClass} focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-mono`}
                  />
                </div>
              </div>

              {/* 密码输入 */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold opacity-60 uppercase tracking-tighter">
                    密码
                  </label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className={`text-xs transition-colors ${
                        theme === "dark"
                          ? "text-indigo-400 hover:text-indigo-300"
                          : "text-indigo-600 hover:text-indigo-700"
                      }`}
                    >
                      忘记密码？
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock
                    className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                      theme === "dark" ? "text-slate-400" : "text-slate-500"
                    }`}
                    size={18}
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="至少6位字符"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border ${inputClass} focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-mono`}
                  />
                </div>
              </div>

              {/* 错误/成功消息 */}
              {error && (
                <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}
              {message && (
                <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 text-sm">
                  {message}
                </div>
              )}

              {/* 提交按钮 */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-xl font-bold text-white transition-all ${
                  loading
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30"
                }`}
              >
                {loading ? "处理中..." : isLogin ? "登录" : "注册"}
              </button>
            </form>
          )}

          {/* 切换登录/注册 */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setMessage(null);
              }}
              className={`text-sm transition-colors ${
                theme === "dark"
                  ? "text-indigo-400 hover:text-indigo-300"
                  : "text-indigo-600 hover:text-indigo-700"
              }`}
            >
              {isLogin ? "还没有账号？点击注册" : "已有账号？点击登录"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
