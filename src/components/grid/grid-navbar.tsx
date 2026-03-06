"use client";

import Link from "next/link";
import { SunOutlined, MoonOutlined } from "@ant-design/icons";
import { useTheme } from "@/components/theme-provider";

export function GridNavbar() {
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--card-bg-elevated)] backdrop-blur-md border-b border-[color:var(--border-color)]">
      <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto relative">
        <div className="flex items-center space-x-2 group">
          <Link
            href="/"
            className="flex items-center space-x-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--page-bg)] rounded-lg"
          >
            <div className="w-8 h-8 bg-[var(--brand)] rounded-full flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm">
              <div className="w-2 h-2 bg-white dark:bg-[var(--page-bg)] rounded-full animate-pulse" />
            </div>
            <span className="text-2xl font-serif font-bold tracking-tight text-[var(--brand-text)] transition-colors">
              <span className="hover:opacity-90 transition-opacity cursor-pointer">
                Stillwell
              </span>
              <span className="text-[var(--muted-foreground)]">.grid</span>
            </span>
          </Link>
        </div>

        <div className="flex items-center">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "light" ? "切换到深色模式" : "切换到浅色模式"}
            className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--muted-foreground)] hover:bg-[var(--hover-bg)] hover:text-[var(--foreground)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--page-bg)]"
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
