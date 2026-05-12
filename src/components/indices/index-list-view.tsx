"use client";

import type { IndexListRow } from "@/types/indices";
import { SearchOutlined } from "@ant-design/icons";
import { Button, Empty, Input, Table, Tooltip } from "antd";
import type { ColumnsType, TableProps } from "antd/es/table";
import Link from "next/link";
import { useMemo, useState } from "react";

const PAGE_SIZE = 12;

const VALUATION_HIGHLIGHT_TOOLTIP =
  "当前分位低于近 5 年与近 10 年分位（MOCK 规则）；数值口径以数据源为准。";

type SortField =
  | "code"
  | "name"
  | "peTtm"
  | "pePercentileCurrent"
  | "percentile5yPe"
  | "percentile10yPe"
  | "pb"
  | "pbPercentileCurrent"
  | "pbPercentile5y"
  | "pbPercentile10y";

function fmtPe(v: number | null): string {
  if (v === null) return "—";
  return v.toLocaleString("zh-CN", { minimumFractionDigits: 2 });
}

function fmtPct(v: number | null): string {
  if (v === null) return "—";
  return `${v.toFixed(1)}%`;
}

function isBelowBothWindows(
  current: number | null,
  y5: number | null,
  y10: number | null
): boolean {
  if (current === null || y5 === null || y10 === null) return false;
  return current < y5 && current < y10;
}

interface PercentileCellProps {
  value: number | null;
  highlight: boolean;
}

function PercentileCell({ value, highlight }: PercentileCellProps) {
  const text = fmtPct(value);
  if (!highlight) {
    return <span className="font-mono tabular-nums">{text}</span>;
  }
  const body = (
    <span className="font-mono tabular-nums indices-list-valuation-highlight">
      {text}
    </span>
  );
  return (
    <Tooltip
      title={VALUATION_HIGHLIGHT_TOOLTIP}
      placement="topLeft"
      trigger={["hover", "click"]}
      mouseEnterDelay={0.1}
    >
      <span className="inline-flex cursor-pointer touch-manipulation rounded-sm">
        {body}
      </span>
    </Tooltip>
  );
}

interface IndexListViewProps {
  initialRows: IndexListRow[];
}

export function IndexListView({ initialRows }: IndexListViewProps) {
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("code");
  const [sortOrder, setSortOrder] = useState<"ascend" | "descend">("ascend");

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return initialRows;
    return initialRows.filter(
      (r) =>
        r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)
    );
  }, [initialRows, keyword]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    const dir = sortOrder === "ascend" ? 1 : -1;
    const cmpNum = (a: number | null, b: number | null) => {
      const ax = a ?? Number.NEGATIVE_INFINITY;
      const bx = b ?? Number.NEGATIVE_INFINITY;
      if (ax === bx) return 0;
      return ax < bx ? -1 : 1;
    };
    list.sort((a, b) => {
      switch (sortField) {
        case "code":
          return dir * a.code.localeCompare(b.code);
        case "name":
          return dir * a.name.localeCompare(b.name, "zh-CN");
        case "peTtm":
          return dir * cmpNum(a.peTtm, b.peTtm);
        case "pePercentileCurrent":
          return dir * cmpNum(a.pePercentileCurrent, b.pePercentileCurrent);
        case "percentile5yPe":
          return dir * cmpNum(a.percentile5yPe, b.percentile5yPe);
        case "percentile10yPe":
          return dir * cmpNum(a.percentile10yPe, b.percentile10yPe);
        case "pb":
          return dir * cmpNum(a.pb, b.pb);
        case "pbPercentileCurrent":
          return dir * cmpNum(a.pbPercentileCurrent, b.pbPercentileCurrent);
        case "pbPercentile5y":
          return dir * cmpNum(a.pbPercentile5y, b.pbPercentile5y);
        case "pbPercentile10y":
          return dir * cmpNum(a.pbPercentile10y, b.pbPercentile10y);
        default:
          return a.code.localeCompare(b.code);
      }
    });
    return list;
  }, [filtered, sortField, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const displayPage = Math.min(page, totalPages);

  const paged = useMemo(() => {
    const start = (displayPage - 1) * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE);
  }, [sorted, displayPage]);

  const linkFocus =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--correlation-brand)] rounded-sm";

  const columns: ColumnsType<IndexListRow> = [
    {
      title: "代码",
      dataIndex: "code",
      key: "code",
      sorter: true,
      sortOrder: sortField === "code" ? sortOrder : null,
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
      title: "名称",
      dataIndex: "name",
      key: "name",
      ellipsis: { showTitle: true },
      sorter: true,
      sortOrder: sortField === "name" ? sortOrder : null,
      render: (name: string, record) => (
        <Link
          href={`/indices/${encodeURIComponent(record.code)}`}
          className={`text-[var(--foreground)] hover:text-[var(--correlation-brand)] transition-colors ${linkFocus}`}
        >
          {name}
        </Link>
      ),
    },
    {
      title: "当前 PE（TTM）",
      dataIndex: "peTtm",
      key: "peTtm",
      align: "right",
      sorter: true,
      sortOrder: sortField === "peTtm" ? sortOrder : null,
      render: (v: number | null) => (
        <span className="font-mono tabular-nums">{fmtPe(v)}</span>
      ),
    },
    {
      title: "当前 PE 分位",
      dataIndex: "pePercentileCurrent",
      key: "pePercentileCurrent",
      align: "right",
      sorter: true,
      sortOrder: sortField === "pePercentileCurrent" ? sortOrder : null,
      render: (_: unknown, row) => (
        <PercentileCell
          value={row.pePercentileCurrent}
          highlight={isBelowBothWindows(
            row.pePercentileCurrent,
            row.percentile5yPe,
            row.percentile10yPe
          )}
        />
      ),
    },
    {
      title: "近 5 年分位（PE）",
      dataIndex: "percentile5yPe",
      key: "percentile5yPe",
      align: "right",
      sorter: true,
      sortOrder: sortField === "percentile5yPe" ? sortOrder : null,
      render: (v: number | null) => (
        <span className="font-mono tabular-nums">{fmtPct(v)}</span>
      ),
    },
    {
      title: "近 10 年分位（PE）",
      dataIndex: "percentile10yPe",
      key: "percentile10yPe",
      align: "right",
      sorter: true,
      sortOrder: sortField === "percentile10yPe" ? sortOrder : null,
      render: (v: number | null) => (
        <span className="font-mono tabular-nums">{fmtPct(v)}</span>
      ),
    },
    {
      title: "当前 PB",
      dataIndex: "pb",
      key: "pb",
      align: "right",
      sorter: true,
      sortOrder: sortField === "pb" ? sortOrder : null,
      render: (v: number | null) => (
        <span className="font-mono tabular-nums">{fmtPe(v)}</span>
      ),
    },
    {
      title: "当前 PB 分位",
      dataIndex: "pbPercentileCurrent",
      key: "pbPercentileCurrent",
      align: "right",
      sorter: true,
      sortOrder: sortField === "pbPercentileCurrent" ? sortOrder : null,
      render: (_: unknown, row) => (
        <PercentileCell
          value={row.pbPercentileCurrent}
          highlight={isBelowBothWindows(
            row.pbPercentileCurrent,
            row.pbPercentile5y,
            row.pbPercentile10y
          )}
        />
      ),
    },
    {
      title: "近 5 年分位（PB）",
      dataIndex: "pbPercentile5y",
      key: "pbPercentile5y",
      align: "right",
      sorter: true,
      sortOrder: sortField === "pbPercentile5y" ? sortOrder : null,
      render: (v: number | null) => (
        <span className="font-mono tabular-nums">{fmtPct(v)}</span>
      ),
    },
    {
      title: "近 10 年分位（PB）",
      dataIndex: "pbPercentile10y",
      key: "pbPercentile10y",
      align: "right",
      sorter: true,
      sortOrder: sortField === "pbPercentile10y" ? sortOrder : null,
      render: (v: number | null) => (
        <span className="font-mono tabular-nums">{fmtPct(v)}</span>
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
      "code",
      "name",
      "peTtm",
      "pePercentileCurrent",
      "percentile5yPe",
      "percentile10yPe",
      "pb",
      "pbPercentileCurrent",
      "pbPercentile5y",
      "pbPercentile10y",
    ];
    if (key && allowed.includes(key as SortField)) {
      if (sorter.order) {
        setSortField(key as SortField);
        setSortOrder(sorter.order);
      } else {
        setSortField("code");
        setSortOrder("ascend");
      }
    }
  };

  const clearKeyword = () => {
    setKeyword("");
    setPage(1);
  };

  return (
    <div className="space-y-8 pb-16">
      <header className="space-y-3">
        <p className="text-xs font-medium tracking-[0.2em] uppercase text-[var(--muted-foreground)]">
          Market center
        </p>
        <h1 className="text-3xl md:text-4xl font-light tracking-tight text-[var(--foreground)]">
          行情中心 · 指数
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] max-w-2xl leading-relaxed">
          MOCK：搜索代码或名称；表头不换行、列宽随内容。当前 PE/PB
          分位若同时低于对应近 5 年与近 10
          年分位，将以浅色底标示（可点击或悬停该单元格查看说明）。
        </p>
      </header>

      {filtered.length === 0 ? (
        <Empty description={keyword.trim() ? "无匹配指数" : "暂无数据"}>
          {keyword.trim() ? (
            <Button type="primary" onClick={clearKeyword}>
              清除关键词
            </Button>
          ) : null}
        </Empty>
      ) : (
        <div className="rounded-xl border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] p-3 sm:p-5">
          <div className="flex justify-end mb-3 min-h-[44px] items-center">
            <Input.Search
              allowClear
              placeholder="搜索名称或代码…"
              enterButton={
                <Button
                  type="primary"
                  aria-label="搜索"
                  icon={<SearchOutlined aria-hidden />}
                  className="h-[44px] min-h-[44px] min-w-[44px] sm:min-w-auto sm:px-3"
                />
              }
              className="w-full sm:max-w-[19rem] sm:w-[min(100%,19rem)] touch-manipulation [&_.ant-input]:text-[15px] [&_.ant-input-affix-wrapper]:h-[44px] [&_.ant-input-affix-wrapper]:min-h-[44px] [&_.ant-btn]:h-[44px] [&_.ant-btn]:min-h-[44px]"
              size="middle"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPage(1);
              }}
              aria-label="搜索指数名称或代码"
            />
          </div>
          <p className="sm:hidden text-xs text-[var(--muted-foreground)] mb-2 leading-relaxed">
            表格列较多时可在下方区域内左右滑动查看全部列。
          </p>
          <div className="indices-table-wrap -mx-1 sm:mx-0">
            <Table<IndexListRow>
              className="indices-list-table"
              tableLayout="auto"
              rowKey={(r) => r.code}
              columns={columns}
              dataSource={paged}
              pagination={{
                current: displayPage,
                pageSize: PAGE_SIZE,
                total: sorted.length,
                showSizeChanger: false,
                hideOnSinglePage: sorted.length <= PAGE_SIZE,
                onChange: (p) => setPage(p),
                className: "!mb-0 mt-3",
              }}
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
