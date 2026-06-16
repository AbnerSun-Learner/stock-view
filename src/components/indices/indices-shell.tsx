"use client";

import { AntdProvider } from "@/components/antd-provider";
import { StillwellSiteNav } from "@/components/stillwell-site-nav";
import Link from "next/link";

interface IndicesShellProps {
  children: React.ReactNode;
}

const navCls =
  "text-sm text-[var(--muted-foreground)] hover:text-[var(--correlation-brand)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--correlation-brand)] rounded-sm px-1 py-2";

export function IndicesShell({ children }: IndicesShellProps) {
  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--foreground)]">
      <StillwellSiteNav
        trailing={
          <nav
            className="flex flex-wrap items-center justify-end gap-x-5 gap-y-1"
            aria-label="站内导航"
          >
            <Link href="/indices" className={navCls}>
              行情中心
            </Link>
            <Link href="/correlation" className={navCls}>
              指数对比
            </Link>
            <Link href="/grid" className={navCls}>
              网格测算
            </Link>
          </nav>
        }
      />
      <AntdProvider>
        <div className="site-container pt-[88px] pb-8">{children}</div>
      </AntdProvider>
    </div>
  );
}
