"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen transition-colors duration-500 bg-[var(--page-bg)] text-[var(--foreground)] selection:bg-slate-200 selection:text-slate-900">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--card-bg-elevated)] backdrop-blur-md border-b border-[color:var(--border-color)]">
        <div className="flex justify-between items-center px-6 md:px-8 py-3.5 max-w-7xl mx-auto">
          <Link
            href="/"
            className="flex items-center space-x-2 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--page-bg)] rounded-lg"
          >
            <div className="w-8 h-8 bg-[var(--brand)] rounded-full flex items-center justify-center transition-transform duration-200 group-hover:scale-105 shadow-sm">
              <div className="w-2 h-2 bg-white dark:bg-[var(--page-bg)] rounded-full animate-pulse" />
            </div>
            <span className="text-2xl font-serif font-bold tracking-tight text-[var(--brand-text)]">
              Stillwell
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/grid"
              className="text-[13px] font-medium tracking-wide text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 rounded-md py-1"
            >
              网格交易
            </Link>
            <Link
              href="/valuation"
              className="text-[13px] font-medium tracking-wide text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 rounded-md py-1"
            >
              指数估值
            </Link>
          </div>
          <div className="w-7 h-7" aria-hidden />
        </div>
      </nav>

      <div className="relative min-h-screen flex items-center justify-center pt-16 pb-24 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-slate-200/15 dark:bg-slate-800/15 rounded-full blur-[120px] -z-10" />

        <header className="px-6 md:px-8 max-w-4xl mx-auto text-center relative z-10">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-[var(--muted-foreground)] mb-6">
            指数投资 · 长期主义
          </p>
          <h1 className="text-5xl md:text-7xl font-serif font-medium leading-[1.08] tracking-tight text-[var(--foreground)] mb-8">
            Still in{" "}
            <span className="italic font-normal text-[var(--muted-foreground)]">Volatility</span>,
            <br />
            Rich in <span className="text-[var(--brand-text)] font-semibold">Time</span>.
          </h1>
          <p className="max-w-xl mx-auto text-base md:text-lg text-[var(--muted-foreground)] leading-relaxed mb-12 font-normal">
            以十年中值为锚，历史高低为界。在这里，遇见让指数投资与内心安宁共生的工具。
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4">
            <Link href="/grid">
              <button className="w-full sm:w-auto min-w-[180px] bg-[var(--brand)] text-white px-8 py-3.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2">
                进入网格策略
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <Link href="/valuation">
              <button className="w-full sm:w-auto min-w-[180px] py-3.5 px-8 rounded-lg text-sm font-medium border border-[color:var(--border-color)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--hover-bg)] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2">
                指数估值
              </button>
            </Link>
          </div>
        </header>

        <footer className="absolute bottom-8 left-0 right-0 text-center">
          <p className="text-[11px] tracking-widest text-[var(--muted-foreground)] opacity-80">
            © Stillwell · 慢即是快，稳即是远
          </p>
        </footer>
      </div>
    </div>
  );
}
