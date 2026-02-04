"use client";

import {
  BookOpen,
  ChevronDown,
  Compass,
  Wind,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function GridNavbar() {
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 dark:bg-[#0F172A]/70 backdrop-blur-md border-b border-blue-100/20 dark:border-white/5">
      <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto relative">
        {/* 左侧：Logo - 衬线体定制 */}
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

        {/* 中间：菜单栏 - 只保留投资指南，靠近右半部分 */}
        <div className="hidden md:flex items-center space-x-10 ml-auto mr-6">
          {/* 投资指南 Dropdown */}
          <div
            className="relative group py-2"
            onMouseEnter={() => setHoveredMenu("guide")}
            onMouseLeave={() => setHoveredMenu(null)}
          >
            <button className="flex items-center space-x-1 text-sm font-medium uppercase tracking-widest opacity-70 hover:opacity-100 transition-opacity cursor-pointer">
              <span>投资指南</span>
              <ChevronDown
                size={14}
                className={`transition-transform duration-300 ${
                  hoveredMenu === "guide" ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* 指南下拉面板 */}
            <div
              className={`absolute top-full left-1/2 -translate-x-1/2 w-80 pt-4 transition-all duration-300 ${
                hoveredMenu === "guide"
                  ? "opacity-100 visible translate-y-0"
                  : "opacity-0 invisible -translate-y-2"
              }`}
            >
              <div className="bg-white dark:bg-[#1E293B] rounded-2xl shadow-2xl shadow-blue-900/10 border border-blue-50 dark:border-white/5 p-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-3 p-3 rounded-xl hover:bg-blue-50 dark:hover:bg-white/5 transition-colors cursor-pointer group/item">
                    <Compass
                      size={18}
                      className="text-slate-400 group-hover/item:text-blue-600"
                    />
                    <span className="text-sm font-medium">新手入林指南</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-xl hover:bg-blue-50 dark:hover:bg-white/5 transition-colors cursor-pointer group/item">
                    <Wind
                      size={18}
                      className="text-slate-400 group-hover/item:text-blue-600"
                    />
                    <span className="text-sm font-medium">波动冥想手册</span>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-xl hover:bg-blue-50 dark:hover:bg-white/5 transition-colors cursor-pointer group/item">
                    <BookOpen
                      size={18}
                      className="text-slate-400 group-hover/item:text-blue-600"
                    />
                    <span className="text-sm font-medium">指数之书</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
