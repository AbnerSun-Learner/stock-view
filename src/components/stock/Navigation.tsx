/**
 * 导航组件（顶部菜单栏）
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navigation() {
  const pathname = usePathname();

  return (
    <header className="mx-auto flex max-w-5xl items-center justify-between border-slate-200/80 py-4">
      <Link
        href="/"
        className="text-lg font-semibold tracking-tight text-slate-900 transition-colors hover:text-slate-700"
      >
        <span className="text-sky-500">ETF</span>
        <span className="text-slate-800">View</span>
      </Link>
      <nav className="flex flex-1 justify-center">
        <ul className="flex items-center gap-8 text-sm font-medium text-slate-700">
          <li>
            <Link
              href="/"
              className={`transition hover:text-slate-900 ${
                pathname === "/" ? "text-slate-900 font-semibold" : ""
              }`}
            >
              首页
            </Link>
          </li>
        </ul>
      </nav>
      <div className="w-4" />
    </header>
  );
}
