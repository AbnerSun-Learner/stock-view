"use client";

import { useEffect, useState } from "react";

interface ChartShellProps {
  /** 占位高度，避免布局抖动 */
  height: number;
  children: React.ReactNode;
}

/**
 * Recharts ResponsiveContainer 在 SSR/hydrate 第一帧拿不到容器尺寸，
 * 会输出 "width(-1) height(-1)" 的 warning。包一层 ChartShell：
 * 第一次 paint 占位空盒子，挂载完成后再渲染真实 chart。
 */
export function ChartShell({ height, children }: ChartShellProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className="w-full min-w-0 overflow-hidden box-border"
      style={{ height }}
    >
      {mounted ? children : null}
    </div>
  );
}
