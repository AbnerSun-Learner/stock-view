"use client";

/**
 * ETF Terminal 通用布局组件
 * 包含导航栏和主题切换，完全按照 demo.jsx 的样式
 */

import { useAuth } from "@/lib/auth";
import {
  Activity,
  Grid,
  LineChart,
  LogIn,
  LogOut,
  Target,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { JSX, useState } from "react";
import { AuthModal } from "./auth-modal";
import { ThemeToggleButton } from "./shared-components";

function TabButton({
  active,
  href,
  icon,
  label,
}: {
  active: boolean;
  href: string;
  icon: JSX.Element;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-row px-4 py-2 items-center gap-2 rounded-xl transition-all ${
        active
          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
          : "hover:bg-slate-100 dark:hover:bg-slate-700 opacity-60 hover:opacity-100"
      }`}
    >
      {icon}
      <span className="text-sm font-bold tracking-tight">{label}</span>
    </Link>
  );
}

export function TerminalLayout({
  theme,
  onToggleTheme,
  children,
}: {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, signOut, isAuthenticated } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const containerClass =
    theme === "dark"
      ? "min-h-screen bg-slate-900 text-slate-100 transition-colors duration-300 pb-20 md:pb-0 font-sans"
      : "min-h-screen bg-slate-50 text-slate-800 transition-colors duration-300 pb-20 md:pb-0 font-sans";

  return (
    <div className={containerClass}>
      <nav
        className={`sticky top-0 z-50 px-6 py-4 flex justify-between items-center border-b ${
          theme === "dark"
            ? "bg-slate-800/80 border-slate-700"
            : "bg-white/80 border-slate-200"
        } backdrop-blur-md`}
      >
        <div className="flex items-center gap-2">
          <Activity className="text-indigo-500" size={28} />
          <h1 className="text-xl font-black tracking-tighter uppercase italic">
            ETF Pro Terminal
          </h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex gap-4">
            <TabButton
              active={pathname === "/grid"}
              href="/grid"
              icon={<Grid size={18} />}
              label="网格策略"
            />
            <TabButton
              active={pathname === "/7080" || pathname === "/"}
              href="/7080"
              icon={<LineChart size={18} />}
              label="7080 指数"
            />
            <TabButton
              active={pathname === "/tracker"}
              href="/tracker"
              icon={<Target size={18} />}
              label="点位追踪"
            />
          </div>
          <div className="flex items-center gap-3 pl-4 border-l border-slate-300">
            <ThemeToggleButton theme={theme} onToggle={onToggleTheme} />
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                  <User
                    size={16}
                    className="text-indigo-600 dark:text-indigo-400"
                  />
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    {user?.email?.split("@")[0] || "用户"}
                  </span>
                </div>
                <button
                  onClick={signOut}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  title="登出"
                >
                  <LogOut size={16} />
                  <span className="text-sm font-bold">登出</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30 transition-all"
              >
                <LogIn size={16} />
                <span className="text-sm font-bold">登录</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* 登录模态框 */}
      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        theme={theme}
      />

      <main className="max-w-7xl mx-auto p-4 md:p-8">{children}</main>

      {/* 移动端底部导航 */}
      <div
        className={`md:hidden fixed bottom-0 left-0 right-0 p-2 flex justify-around border-t ${
          theme === "dark"
            ? "bg-slate-800 border-slate-700"
            : "bg-white border-slate-200"
        } z-50`}
      >
        <Link
          href="/grid"
          className={`flex flex-col py-2 w-full items-center gap-2 rounded-xl transition-all ${
            pathname === "/grid"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
              : "opacity-60 hover:opacity-100"
          }`}
        >
          <Grid size={20} />
          <span className="text-sm font-bold tracking-tight">网格</span>
        </Link>
        <Link
          href="/7080"
          className={`flex flex-col py-2 w-full items-center gap-2 rounded-xl transition-all ${
            pathname === "/7080" || pathname === "/"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
              : "opacity-60 hover:opacity-100"
          }`}
        >
          <LineChart size={20} />
          <span className="text-sm font-bold tracking-tight">7080</span>
        </Link>
        <Link
          href="/tracker"
          className={`flex flex-col py-2 w-full items-center gap-2 rounded-xl transition-all ${
            pathname === "/tracker"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
              : "opacity-60 hover:opacity-100"
          }`}
        >
          <Target size={20} />
          <span className="text-sm font-bold tracking-tight">追踪</span>
        </Link>
      </div>
    </div>
  );
}
