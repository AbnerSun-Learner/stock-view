"use client";

import { X } from "lucide-react";
import { useState } from "react";

interface SaveSchemeModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
  theme: "light" | "dark";
}

export function SaveSchemeModal({
  open,
  onClose,
  onSave,
  theme,
}: SaveSchemeModalProps) {
  const [schemeName, setSchemeName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!open) return null;

  const handleSave = async () => {
    if (!schemeName.trim()) return;
    setIsLoading(true);
    try {
      await onSave(schemeName);
      setSchemeName("");
      onClose();
    } catch (error) {
      console.error("保存失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-blue-50/50 dark:border-white/5 bg-white/90 dark:bg-[#1E293B]/90 backdrop-blur-md shadow-2xl shadow-blue-900/20 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-serif font-medium text-[#243B53] dark:text-blue-100">
            保存交易方案
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-blue-50 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>
        <p className="text-sm opacity-70 mb-4 font-light">
          为您的交易方案输入一个名称，方便后续查看和对比
        </p>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="scheme-name"
              className="block text-sm font-semibold text-[#243B53] dark:text-blue-100 mb-2 uppercase tracking-wide text-xs"
            >
              方案名称
            </label>
            <input
              id="scheme-name"
              type="text"
              placeholder="例如：保守型策略-2025年1月"
              value={schemeName}
              onChange={(e) => setSchemeName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isLoading) {
                  handleSave();
                }
              }}
              className="w-full p-3 rounded-xl border border-blue-100/50 dark:border-white/5 bg-white/50 dark:bg-slate-800/50 text-[#243B53] dark:text-blue-100 focus:ring-2 focus:ring-blue-500 outline-none backdrop-blur-sm"
              autoFocus
              disabled={isLoading}
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-3 px-4 rounded-full border border-blue-100/50 dark:border-white/5 bg-white/50 dark:bg-slate-800/50 text-[#243B53] dark:text-blue-100 hover:bg-blue-50/50 dark:hover:bg-white/10 transition-all font-bold cursor-pointer disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading || !schemeName.trim()}
              className="flex-1 py-3 px-4 rounded-full bg-[#243B53] dark:bg-blue-500 hover:scale-105 active:scale-95 text-white transition-all font-bold shadow-lg shadow-blue-900/10 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              {isLoading ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
