"use client";

import { StillwellMark } from "@/components/stillwell-mark";
import { useTheme } from "@/components/theme-provider";
import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import Link from "next/link";

interface CorrelationNavbarProps {
  /** 与指数对比页底色对齐，避免顶栏一条「纯白腰带」 */
  surface?: "default" | "correlation";
}

export function CorrelationNavbar({
  surface = "default",
}: CorrelationNavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const markVariant = theme === "dark" ? "inverse" : "color";
  const navBg =
    surface === "correlation"
      ? "bg-[var(--correlation-page-tint)]"
      : "bg-[var(--page-bg)]";

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 ${navBg} border-b border-[color:var(--border-color)]`}
    >
      <div className="flex justify-between items-center px-8 md:px-16 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-1">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--foreground)] hover:opacity-70 transition-opacity duration-300 tracking-wide"
          >
            <StillwellMark size={24} variant={markVariant} />
            Stillwell
          </Link>
          <Link
            href="/correlation"
            className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-300 tracking-wide valuation-nav-link"
          >
            .comparison
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
