"use client";

import type { CorrelationApiResponse } from "@/types/correlation";

interface CorrelationMissingSectionProps {
  missing: CorrelationApiResponse["missing"];
}

export function CorrelationMissingSection({
  missing,
}: CorrelationMissingSectionProps) {
  const hasKlineMissing = missing.kline.length > 0;
  const hasHoldingsMissing = missing.holdings.length > 0;
  if (!hasKlineMissing && !hasHoldingsMissing) return null;

  return (
    <div className="border border-[color:var(--border-color)] p-6 md:p-8">
      <p className="text-xs font-medium tracking-[0.18em] uppercase text-[var(--muted-foreground)] mb-4">
        Data Notes
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MissingBlock title="行情数据缺失" items={missing.kline} />
        <MissingBlock title="成分数据缺失" items={missing.holdings} />
      </div>
    </div>
  );
}

interface MissingBlockProps {
  title: string;
  items: { code: string; reason: string }[];
}

function MissingBlock({ title, items }: MissingBlockProps) {
  return (
    <div>
      <p className="text-sm text-[var(--foreground)] mb-2">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-[var(--muted-foreground)]">无</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.code} className="text-xs text-[var(--muted-foreground)]">
              <span className="font-mono text-[var(--foreground)] mr-2">
                {item.code}
              </span>
              {item.reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
