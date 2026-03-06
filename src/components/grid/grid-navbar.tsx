"use client";

import Link from "next/link";

export function GridNavbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 dark:bg-[#0F172A]/70 backdrop-blur-md border-b border-blue-100/20 dark:border-white/5">
      <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto relative">
        {/* 左侧：Logo */}
        <div className="flex items-center space-x-2 group">
          <Link
            href="/"
            className="flex items-center space-x-2 cursor-pointer"
          >
            <div className="w-8 h-8 bg-[#243B53] dark:bg-blue-400 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm">
              <div className="w-2 h-2 bg-white dark:bg-[#0F172A] rounded-full animate-pulse"></div>
            </div>
            <span className="text-2xl font-serif font-bold tracking-tight text-[#243B53] dark:text-blue-100 transition-colors">
              <span className="hover:text-blue-600 dark:hover:text-blue-300 transition-colors cursor-pointer">
                Stillwell
              </span>
              <span className="opacity-70">.grid</span>
            </span>
          </Link>
        </div>

        {/* 右侧：关于我们 */}
        <div className="flex items-center space-x-4">
          <Link
            href="#"
            className="text-sm font-medium uppercase tracking-widest opacity-70 hover:opacity-100 transition-opacity"
          >
            关于我们
          </Link>
        </div>
      </div>
    </nav>
  );
}
