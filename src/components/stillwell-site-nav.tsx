"use client";

import { StillwellMark } from "@/components/stillwell-mark";
import Link from "next/link";
import type { ReactNode } from "react";

interface StillwellSiteNavProps {
  /** 顶栏右侧（如落地页导航）；省略时仅保留左侧品牌区 */
  trailing?: ReactNode;
  /** 与页面主内容区对齐的容器修饰类（如网格页 site-container--grid） */
  containerClassName?: string;
}

/** 全站统一顶栏：Logo + Stillwell 字样的尺寸与左边距固定，避免跨路由闪烁或错位 */
export function StillwellSiteNav({
  trailing,
  containerClassName,
}: StillwellSiteNavProps) {
  return (
    <header
      className="fixed inset-x-0 top-0 z-50 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--nav-bg)_94%,transparent)] backdrop-blur-md"
      role="banner"
    >
      <div
        className={`site-container flex h-[72px] items-center justify-between gap-4${
          containerClassName ? ` ${containerClassName}` : ""
        }`}
      >
        <Link
          href="/"
          className="site-nav-brand inline-flex shrink-0 items-center gap-2.5 transition-opacity duration-200 focus-visible:rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          aria-label="Stillwell 首页"
        >
          <StillwellMark size={18} />
          <span className="nav-brand-en text-[1.0625rem] leading-none">
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
