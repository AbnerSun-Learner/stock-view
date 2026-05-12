"use client";

import { StillwellMark } from "@/components/stillwell-mark";
import Link from "next/link";
import type { ReactNode } from "react";

interface StillwellSiteNavProps {
  /** 顶栏右侧（如落地页导航）；省略时仅保留左侧品牌区 */
  trailing?: ReactNode;
}

/** 全站统一顶栏：Logo + Stillwell 字样的尺寸与左边距固定，避免跨路由闪烁或错位 */
export function StillwellSiteNav({ trailing }: StillwellSiteNavProps) {
  return (
    <header
      className="fixed inset-x-0 top-0 z-50 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--nav-bg)_94%,transparent)] backdrop-blur-md"
      role="banner"
    >
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-4 px-6 lg:px-10">
        <Link
          href="/"
          className="inline-flex shrink-0 items-center gap-2.5 text-[var(--foreground)] transition-colors duration-200 hover:text-[var(--accent)] focus-visible:rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          aria-label="Stillwell 首页"
        >
          <StillwellMark size={26} />
          <span className="nav-brand-en text-[1.25rem] leading-none">
            Stillwell
          </span>
        </Link>
        {trailing ? (
          <div className="flex min-w-0 flex-1 justify-end">{trailing}</div>
        ) : null}
      </div>
    </header>
  );
}
