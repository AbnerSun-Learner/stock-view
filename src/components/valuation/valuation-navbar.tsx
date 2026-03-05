"use client";

import Link from "next/link";
import { SunOutlined, MoonOutlined } from "@ant-design/icons";
import { useTheme } from "@/components/theme-provider";

export function ValuationNavbar() {
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 dark:bg-[#0F172A]/70 backdrop-blur-md border-b border-blue-100/20 dark:border-white/5">
      <div className="flex justify-between items-center px-4 py-4 max-w-[1400px] mx-auto relative">
        <div className="flex items-center space-x-2 group">
          <Link
            href="/"
            className="flex items-center space-x-2 cursor-pointer"
          >
            <div className="w-8 h-8 bg-[#243B53] dark:bg-blue-400 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm">
              <div className="w-2 h-2 bg-white dark:bg-[#0F172A] rounded-full animate-pulse"></div>
            </div>
            <span className="text-2xl font-serif font-bold tracking-tight text-[#243B53] dark:text-blue-100 hover:text-blue-600 dark:hover:text-blue-300 transition-colors">
              Stillwell
            </span>
          </Link>
          <Link
            href="/valuation"
            className="text-2xl font-serif font-bold tracking-tight text-[#243B53]/70 dark:text-blue-100/70 hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
          >
            .valuation
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="#"
            className="text-sm font-medium uppercase tracking-widest opacity-70 hover:opacity-100 transition-opacity"
          >
            投资心法
          </Link>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "light" ? "切换到深色模式" : "切换到浅色模式"}
            className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            {theme === "light" ? (
              <SunOutlined style={{ fontSize: 16 }} />
            ) : (
              <MoonOutlined style={{ fontSize: 16 }} />
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}
