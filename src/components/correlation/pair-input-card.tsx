"use client";

import { Input } from "antd";
import { useEffect, useState } from "react";

interface PairInputCardProps {
  loading: boolean;
  currentA: string;
  currentB: string;
  onSubmit: (codeA: string, codeB: string) => void;
}

export function PairInputCard({
  loading,
  currentA,
  currentB,
  onSubmit,
}: PairInputCardProps) {
  const [codeA, setCodeA] = useState(currentA);
  const [codeB, setCodeB] = useState(currentB);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setCodeA(currentA);
      setCodeB(currentB);
    });
    return () => cancelAnimationFrame(id);
  }, [currentA, currentB]);

  function handleSubmit() {
    onSubmit(codeA.trim(), codeB.trim());
  }

  return (
    <div className="correlation-card correlation-card--tint p-6 md:p-8 space-y-6">
      <div>
        <p className="correlation-eyebrow text-xs font-semibold tracking-[0.2em] uppercase">
          ETF Selection
        </p>
        <h3 className="mt-2 text-lg font-light text-[var(--foreground)]">
          ETF 选择
        </h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-medium tracking-[0.18em] uppercase text-[var(--muted-foreground)] mb-2">
            ETF 1
          </label>
          <Input
            value={codeA}
            onChange={(e) => setCodeA(e.target.value)}
            onPressEnter={handleSubmit}
            placeholder="请输入 6 位代码"
            className="correlation-textarea"
            style={{ borderRadius: 0 }}
            maxLength={6}
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium tracking-[0.18em] uppercase text-[var(--muted-foreground)] mb-2">
            ETF 2
          </label>
          <Input
            value={codeB}
            onChange={(e) => setCodeB(e.target.value)}
            onPressEnter={handleSubmit}
            placeholder="请输入 6 位代码"
            className="correlation-textarea"
            style={{ borderRadius: 0 }}
            maxLength={6}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading}
        className="w-full h-10 px-6 text-xs font-medium tracking-wide bg-[var(--correlation-brand)] text-[var(--correlation-on-brand)] hover:opacity-70 transition-opacity duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
        style={{ letterSpacing: "0.06em" }}
      >
        {loading ? "分析中…" : "开始分析"}
      </button>

      <p className="text-[11px] leading-relaxed text-[var(--muted-foreground)]">
        支持 6 位国内 ETF 代码。建议从同主题 ETF 开始对比，更容易发现重复风险。
      </p>
    </div>
  );
}
