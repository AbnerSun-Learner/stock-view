"use client";

/**
 * ETF Terminal 共享组件
 * 完全按照 demo.jsx 的实现
 */

import {
  ArrowRightLeft,
  Calculator,
  ChevronRight,
  Info,
  Moon,
  Save,
  Sun,
  Trash2,
} from "lucide-react";

export function StatCard({
  title,
  value,
  color,
}: {
  title: string;
  value: string;
  color: "indigo" | "green" | "blue" | "slate";
}) {
  const colors = {
    indigo: "border-indigo-500 text-indigo-600 dark:text-indigo-400",
    green: "border-green-500 text-green-600 dark:text-green-400",
    blue: "border-blue-500 text-blue-600 dark:text-blue-400",
    slate: "border-slate-500 text-slate-600 dark:text-slate-400",
  };
  return (
    <div
      className={`p-4 rounded-2xl bg-white dark:bg-slate-800 border-l-4 shadow-sm ${
        colors[color] || colors.slate
      }`}
    >
      <p className="text-[10px] font-black uppercase opacity-50 tracking-widest">
        {title}
      </p>
      <p className="text-xl font-mono font-black mt-1">{value}</p>
    </div>
  );
}

export function InputGroup({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: "text" | "number" | "email" | "password";
}) {
  const displayValue =
    type === "number" &&
    (value === null || value === undefined || Number.isNaN(Number(value)))
      ? ""
      : value;
  return (
    <div className="flex flex-col gap-1 w-full">
      <label className="text-[10px] font-black opacity-40 uppercase tracking-tighter">
        {label}
      </label>
      <input
        type={type}
        value={displayValue}
        onChange={(e) => onChange(e.target.value)}
        step="any"
        className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-mono font-bold"
      />
    </div>
  );
}

export function ThemeToggleButton({
  theme,
  onToggle,
}: {
  theme: "light" | "dark";
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
    >
      {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  );
}

