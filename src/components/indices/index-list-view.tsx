"use client";

import type { IndexListRow } from "@/types/indices";
import { SearchOutlined } from "@ant-design/icons";
import { Button, Empty, Input, Table, Tooltip } from "antd";
import type { ColumnsType, TableProps } from "antd/es/table";
import Link from "next/link";
import { useMemo, useState } from "react";

const VALUATION_HIGHLIGHT_TOOLTIP =
  "当前分位低于近 5 年与近 10 年分位；数值口径以 TuShare 返回数据为准。";

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

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

interface PercentileCellProps {
  value: number | null;
  highlight: boolean;
}

interface IndexListStatProps {
  label: string;
  value: string;
  tone?: "default" | "brand";
}

function IndexListStat({ label, value, tone = "default" }: IndexListStatProps) {
  const valueClass =
    tone === "brand"
      ? "text-[var(--correlation-brand)]"
      : "text-[var(--foreground)]";

  return (
    <div className="rounded-2xl border border-[color:var(--border-color)] bg-[color-mix(in_srgb,var(--correlation-card-surface)_84%,transparent)] p-4 shadow-[0_10px_26px_color-mix(in_srgb,var(--foreground)_4%,transparent)]">
      <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
      <p className={`mt-2 font-mono text-2xl tabular-nums ${valueClass}`}>
        {value}
      </p>
    </div>
  );
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

  const stats = useMemo(() => {
    const lowPeRows = initialRows.filter((row) =>
      isBelowBothWindows(
        row.pePercentileCurrent,
        row.percentile5yPe,
        row.percentile10yPe
      )
    );
    const lowPbRows = initialRows.filter((row) =>
      isBelowBothWindows(
        row.pbPercentileCurrent,
        row.pbPercentile5y,
        row.pbPercentile10y
      )
    );
    const avgPePercentile = mean(
      initialRows
        .map((row) => row.pePercentileCurrent)
        .filter((value): value is number => value !== null)
    );
    return {
      total: initialRows.length,
      lowPe: lowPeRows.length,
      lowPb: lowPbRows.length,
      avgPePercentile,
    };
  }, [initialRows]);

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
      sorter: true,
      sortOrder: sortField === "name" ? sortOrder : null,
      render: (name: string, record) => (
        <div className="min-w-[8.5rem]">
          <Link
            href={`/indices/${encodeURIComponent(record.code)}`}
            className={`text-[var(--foreground)] hover:text-[var(--correlation-brand)] transition-colors ${linkFocus}`}
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
  };

  return (
    <div className="space-y-8 pb-16">
      <header className="relative overflow-hidden rounded-2xl border border-[color:var(--border-color)] bg-[linear-gradient(135deg,var(--correlation-card-surface),var(--correlation-card-tint))] p-5 shadow-[0_18px_48px_color-mix(in_srgb,var(--foreground)_6%,transparent)] md:p-7">
        <div
          className="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--correlation-brand)_14%,transparent),transparent_68%)]"
          aria-hidden
        />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)] lg:items-end">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] uppercase text-[var(--correlation-brand)]">
              Market center · Index
            </p>
            <h1 className="mt-3 text-3xl font-light tracking-tight text-[var(--foreground)] md:text-5xl">
              行情中心 · 指数
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--muted-foreground)]">
              扫描指数 PE/PB
              与历史分位，快速定位沪深300、科创50等指数当前估值位置。
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] px-3 py-1 text-[var(--muted-foreground)]">
                表头可排序
              </span>
              <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] px-3 py-1 text-[var(--muted-foreground)]">
                支持名称 / 代码搜索
              </span>
              <span className="rounded-full border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] px-3 py-1 text-[var(--muted-foreground)]">
                低分位点击查看说明
              </span>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <IndexListStat label="指数样本" value={`${stats.total}`} />
            <IndexListStat
              label="PE 低分位"
              value={`${stats.lowPe}`}
              tone="brand"
            />
            <IndexListStat
              label="PB 低分位"
              value={`${stats.lowPb}`}
              tone="brand"
            />
            <IndexListStat
              label="平均 PE 分位"
              value={fmtPct(stats.avgPePercentile)}
            />
          </div>
        </div>
      </header>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] p-10 text-center shadow-[0_14px_36px_color-mix(in_srgb,var(--foreground)_5%,transparent)]">
          <Empty description={keyword.trim() ? "无匹配指数" : "暂无数据"}>
            {keyword.trim() ? (
              <Button type="primary" onClick={clearKeyword}>
                清除关键词
              </Button>
            ) : null}
          </Empty>
        </div>
      ) : (
        <div className="rounded-2xl border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] p-4 shadow-[0_14px_36px_color-mix(in_srgb,var(--foreground)_5%,transparent)] sm:p-5">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-medium tracking-wide text-[var(--foreground)]">
                指数估值列表
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-[var(--muted-foreground)]">
                当前显示{" "}
                <span className="font-mono text-[var(--foreground)]">
                  {sorted.length}
                </span>{" "}
                个匹配项；已平铺展示全部结果。
              </p>
            </div>
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
