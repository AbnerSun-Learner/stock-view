"use client";

import type { IndexListRow } from "@/types/indices";
import { Empty, Table } from "antd";
import type { ColumnsType, TableProps } from "antd/es/table";
import Link from "next/link";
import { useMemo, useState } from "react";

type SortField =
  | "displayOrder"
  | "close"
  | "historyHigh"
  | "drawdownFromHighPct"
  | "peTtm"
  | "pb";

function fmtNumber(v: number | null, digits = 2): string {
  if (v === null) return "—";
  return v.toLocaleString("zh-CN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function fmtPct(v: number | null): string {
  if (v === null) return "—";
  return `${v.toFixed(1)}%`;
}

interface ValuationCellProps {
  value: number | null;
  percentile: number | null;
  tone: "pe" | "pb";
}

function valuationToneClass(tone: ValuationCellProps["tone"]): string {
  if (tone === "pb")
    return "border-emerald-300 text-emerald-700 bg-[linear-gradient(135deg,#ecfdf5,#ffffff)] shadow-[0_8px_18px_rgba(16,185,129,0.10)]";
  return "border-[color-mix(in_srgb,var(--correlation-brand)_28%,var(--border-color))] text-[var(--correlation-brand)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--correlation-brand)_8%,#fff),#fff)] shadow-[0_8px_18px_color-mix(in_srgb,var(--correlation-brand)_10%,transparent)]";
}

function ValuationCell({ value, percentile, tone }: ValuationCellProps) {
  const text =
    percentile === null
      ? fmtNumber(value)
      : `${fmtNumber(value)} @${fmtPct(percentile)}`;

  return (
    <span
      className={`inline-flex min-w-[8.5rem] justify-center rounded-lg border px-3 py-2 font-mono text-sm font-medium tabular-nums ${valuationToneClass(
        tone
      )}`}
    >
      {text}
    </span>
  );
}

interface IndexListViewProps {
  initialRows: IndexListRow[];
}

export function IndexListView({ initialRows }: IndexListViewProps) {
  const [sortField, setSortField] = useState<SortField>("displayOrder");
  const [sortOrder, setSortOrder] = useState<"ascend" | "descend">("ascend");

  const sorted = useMemo(() => {
    const list = [...initialRows];
    const dir = sortOrder === "ascend" ? 1 : -1;
    const cmpNum = (a: number | null, b: number | null) => {
      const ax = a ?? Number.NEGATIVE_INFINITY;
      const bx = b ?? Number.NEGATIVE_INFINITY;
      if (ax === bx) return 0;
      return ax < bx ? -1 : 1;
    };
    list.sort((a, b) => {
      switch (sortField) {
        case "displayOrder":
          return dir * cmpNum(a.displayOrder, b.displayOrder);
        case "close":
          return dir * cmpNum(a.close, b.close);
        case "historyHigh":
          return dir * cmpNum(a.historyHigh, b.historyHigh);
        case "drawdownFromHighPct":
          return dir * cmpNum(a.drawdownFromHighPct, b.drawdownFromHighPct);
        case "peTtm":
          return dir * cmpNum(a.peTtm, b.peTtm);
        case "pb":
          return dir * cmpNum(a.pb, b.pb);
        default:
          return a.name.localeCompare(b.name, "zh-CN");
      }
    });
    return list;
  }, [initialRows, sortField, sortOrder]);

  const linkFocus =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--correlation-brand)] rounded-sm";

  const columns: ColumnsType<IndexListRow> = [
    {
      title: "名称",
      dataIndex: "name",
      key: "name",
      fixed: "left",
      width: 160,
      ellipsis: { showTitle: true },
      render: (name: string, record) => (
        <div className="min-w-[8.5rem]">
          <Link
            href={`/indices/${encodeURIComponent(record.code)}`}
            className={`font-medium text-[var(--foreground)] hover:text-[var(--correlation-brand)] transition-colors ${linkFocus}`}
          >
            {name}
          </Link>
          <p className="mt-1 font-mono text-[10px] leading-none text-[var(--muted-foreground)]">
            更新 {record.asOfDate}
          </p>
        </div>
      ),
    },
    {
      title: "代码",
      dataIndex: "code",
      key: "code",
      fixed: "left",
      width: 132,
      render: (code: string) => (
        <Link
          href={`/indices/${encodeURIComponent(code)}`}
          className={`font-mono tabular-nums text-[var(--correlation-brand)] hover:opacity-80 ${linkFocus}`}
        >
          {code}
        </Link>
      ),
    },
    {
      title: "收盘价",
      dataIndex: "close",
      key: "close",
      align: "right",
      sorter: true,
      sortOrder: sortField === "close" ? sortOrder : null,
      render: (v: number | null) => (
        <span className="font-mono tabular-nums">{fmtNumber(v)}</span>
      ),
    },
    {
      title: "历史最高",
      dataIndex: "historyHigh",
      key: "historyHigh",
      align: "right",
      sorter: true,
      sortOrder: sortField === "historyHigh" ? sortOrder : null,
      render: (v: number | null) => (
        <span className="font-mono tabular-nums">{fmtNumber(v)}</span>
      ),
    },
    {
      title: "距历史最高",
      dataIndex: "drawdownFromHighPct",
      key: "drawdownFromHighPct",
      align: "right",
      sorter: true,
      sortOrder: sortField === "drawdownFromHighPct" ? sortOrder : null,
      render: (v: number | null) => (
        <span className="font-mono tabular-nums">{fmtPct(v)}</span>
      ),
    },
    {
      title: "PE_TTM",
      dataIndex: "peTtm",
      key: "peTtm",
      align: "right",
      sorter: true,
      sortOrder: sortField === "peTtm" ? sortOrder : null,
      render: (_: unknown, row) => (
        <ValuationCell
          value={row.peTtm}
          percentile={row.pePercentileCurrent}
          tone="pe"
        />
      ),
    },
    {
      title: "PB",
      dataIndex: "pb",
      key: "pb",
      align: "right",
      sorter: true,
      sortOrder: sortField === "pb" ? sortOrder : null,
      render: (_: unknown, row) => (
        <ValuationCell
          value={row.pb}
          percentile={row.pbPercentileCurrent}
          tone="pb"
        />
      ),
    },
  ];

  const handleTableChange: TableProps<IndexListRow>["onChange"] = (
    _pagination,
    _filters,
    sorter,
    extra
  ) => {
    if (extra.action !== "sort") return;
    if (Array.isArray(sorter)) return;
    const raw = sorter.field;
    const key =
      typeof raw === "string"
        ? raw
        : Array.isArray(raw)
        ? String(raw[0])
        : undefined;
    const allowed: SortField[] = [
      "close",
      "historyHigh",
      "drawdownFromHighPct",
      "peTtm",
      "pb",
    ];
    if (key && allowed.includes(key as SortField)) {
      if (sorter.order) {
        setSortField(key as SortField);
        setSortOrder(sorter.order);
      } else {
        setSortField("displayOrder");
        setSortOrder("ascend");
      }
    }
  };

  return (
    <div className="space-y-8 pb-16">
      <header className="mb-10 lg:mb-12">
        <div className="ds-section-label">
          <span className="ds-section-label__text">Market Center</span>
        </div>
        <h1 className="font-display mb-4 text-3xl font-light text-[var(--foreground)] md:text-[2.75rem] md:leading-[1.12]">
          行情中心 · 指数
        </h1>
        <p className="max-w-xl text-[15px] leading-[1.8] text-[var(--muted-foreground)]">
          扫描指数 PE/PB 与历史分位，快速定位沪深300、科创50等指数当前估值位置。
        </p>
      </header>

      {initialRows.length === 0 ? (
        <div className="rounded-2xl border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] p-10 text-center shadow-[0_14px_36px_color-mix(in_srgb,var(--foreground)_5%,transparent)]">
          <Empty description="暂无数据" />
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] shadow-[0_14px_36px_color-mix(in_srgb,var(--foreground)_5%,transparent)]">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_18%_0%,color-mix(in_srgb,var(--correlation-brand)_10%,transparent),transparent_58%)]"
            aria-hidden
          />
          <div className="relative border-b border-[color:var(--border-color)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--correlation-card-tint)_78%,transparent),var(--correlation-card-surface))] px-4 py-4 sm:px-5">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] uppercase text-[var(--correlation-brand)]">
                Valuation Screener
              </p>
              <h2 className="mt-1 text-lg font-medium tracking-wide text-[var(--foreground)]">
                指数估值列表
              </h2>
            </div>
          </div>
          <p className="relative px-4 pt-3 text-xs leading-relaxed text-[var(--muted-foreground)] sm:hidden">
            表格列较多时可在下方区域内左右滑动查看全部列。
          </p>
          <div className="indices-table-wrap relative px-2 pb-3 sm:px-4 sm:pb-4">
            <Table<IndexListRow>
              className="indices-list-table"
              tableLayout="auto"
              rowKey={(r) => r.code}
              columns={columns}
              dataSource={sorted}
              pagination={false}
              scroll={{ x: "max-content" }}
              onChange={handleTableChange}
              size="middle"
            />
          </div>
        </div>
      )}
    </div>
  );
}
