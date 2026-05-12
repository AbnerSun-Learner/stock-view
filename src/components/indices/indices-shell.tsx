"use client";

import { AntdProvider } from "@/components/antd-provider";
import { IndicesNavbar } from "@/components/indices/indices-navbar";

interface IndicesShellProps {
  children: React.ReactNode;
}

export function IndicesShell({ children }: IndicesShellProps) {
  return (
    <AntdProvider>
      <div className="min-h-screen bg-[var(--page-bg)] text-[var(--foreground)]">
        <IndicesNavbar />
        <div className="pt-24 max-w-7xl mx-auto px-8 md:px-16">{children}</div>
      </div>
    </AntdProvider>
  );
}
