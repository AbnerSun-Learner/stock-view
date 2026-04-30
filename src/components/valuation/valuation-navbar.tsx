"use client";

import { useTheme } from "@/components/theme-provider";
import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import Link from "next/link";

export function ValuationNavbar() {
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--page-bg)] border-b border-[color:var(--border-color)]">
      <div className="flex justify-between items-center px-8 md:px-16 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-1">
          <Link
            href="/"
            className="text-sm font-medium text-[var(--foreground)] hover:opacity-70 transition-opacity duration-300 tracking-wide"
          >
            Stillwell
          </Link>
          <Link
            href="/valuation"
            className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-300 tracking-wide valuation-nav-link"
          >
            .valuation
          </Link>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === "light" ? "切换到深色模式" : "切换到浅色模式"}
          className="w-8 h-8 flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-300"
        >
          {theme === "light" ? (
            <SunOutlined style={{ fontSize: 14 }} />
          ) : (
            <MoonOutlined style={{ fontSize: 14 }} />
          )}
        </button>
      </div>
    </nav>
  );
}
