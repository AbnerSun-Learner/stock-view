"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

export interface ValuationMenuItem {
  id: string;
  name: string;
  symbol: string;
  children?: ValuationMenuItem[];
}

const MVP_INDEX_MENU: ValuationMenuItem[] = [
  {
    id: "ag-dapan",
    name: "A股大盘股",
    symbol: "",
    children: [
      { id: "hs300", name: "沪深300指数", symbol: "000300", children: [] },
    ],
  },
];

interface ValuationSidebarProps {
  selectedSymbol: string | null;
  onSelect: (item: ValuationMenuItem) => void;
}

export function ValuationSidebar({ selectedSymbol, onSelect }: ValuationSidebarProps) {
  const [expandedId, setExpandedId] = useState<string>("ag-dapan");

  return (
    <nav className="space-y-1">
      {MVP_INDEX_MENU.map((level1) => {
        const isExpanded = expandedId === level1.id;
        const hasChildren = level1.children && level1.children.length > 0;

        return (
          <div key={level1.id}>
            <button
              type="button"
              onClick={() =>
                hasChildren
                  ? setExpandedId(isExpanded ? "" : level1.id)
                  : onSelect(level1)
              }
              className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-[var(--hover-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              <span className="text-[var(--foreground)]">
                {level1.name}
              </span>
              {hasChildren &&
                (isExpanded ? (
                  <ChevronDown size={16} className="text-slate-400" />
                ) : (
                  <ChevronRight size={16} className="text-slate-400" />
                ))}
            </button>
            {hasChildren && isExpanded && (
              <div className="ml-3 mt-1 space-y-0.5 border-l border-[color:var(--border-color)] pl-3">
                {level1.children!.map((level2) => {
                  const isSelected = selectedSymbol === level2.symbol;
                  return (
                    <button
                      key={level2.id}
                      type="button"
                      onClick={() => onSelect(level2)}
                      className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        isSelected
                          ? "bg-[var(--hover-bg)] text-[var(--foreground)]"
                          : "text-[var(--muted-foreground)] hover:bg-[var(--hover-bg)]"
                      }`}
                    >
                      {level2.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
