"use client";

import { StillwellMark } from "@/components/stillwell-mark";
import Link from "next/link";

interface CorrelationNavbarProps {
  /** 与指数对比页底色对齐，避免顶栏一条「纯白腰带」 */
  surface?: "default" | "correlation";
}

export function CorrelationNavbar({
  surface = "default",
}: CorrelationNavbarProps) {
  const navBg =
    surface === "correlation"
      ? "bg-[color-mix(in_srgb,var(--nav-bg)_94%,transparent)]"
      : "bg-[color-mix(in_srgb,var(--page-bg)_94%,transparent)]";

  return (
    <nav
      className={`fixed left-0 right-0 top-0 z-50 border-b border-[var(--border)] ${navBg} backdrop-blur-md`}
    >
      <div className="mx-auto flex h-[72px] max-w-6xl items-center px-6 lg:px-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 text-[var(--foreground)] transition-colors duration-200 hover:text-[var(--accent)]"
        >
          <StillwellMark size={26} />
          <span className="nav-brand-en text-[1.25rem] leading-none">
            Stillwell
          </span>
        </Link>
      </div>
    </nav>
  );
}
