"use client";

import { StillwellMark } from "@/components/stillwell-mark";
import Link from "next/link";

export function GridNavbar() {
  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--nav-bg)_94%,transparent)] backdrop-blur-md">
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
