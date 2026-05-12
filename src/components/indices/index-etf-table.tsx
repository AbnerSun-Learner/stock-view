"use client";

import { sortTrackingEtfs } from "@/lib/indices/sort-etfs";
import type { TrackingEtfRow } from "@/types/indices";
import { CopyOutlined } from "@ant-design/icons";
import { App, Button, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo } from "react";

interface IndexEtfTableProps {
  etfs: readonly TrackingEtfRow[];
}

function fmtYi(v: number | null): string {
  if (v === null) return "—";
  return `${v.toLocaleString("zh-CN", { maximumFractionDigits: 2 })}`;
}

function fmtPctRatio(v: number | null): string {
  if (v === null) return "—";
  return `${(v * 100).toFixed(2)}%`;
}

function fmtPctPoints(v: number | null): string {
  if (v === null) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

export function IndexEtfTable({ etfs }: IndexEtfTableProps) {
  const { message } = App.useApp();
  const sorted = useMemo(() => sortTrackingEtfs(etfs), [etfs]);

  const columns: ColumnsType<TrackingEtfRow> = [
    {
      title: "代码",
      dataIndex: "code",
      key: "code",
      fixed: "left",
      width: 132,
      render: (code: string) => (
        <span className="font-mono tabular-nums text-[var(--foreground)]">
          {code}
        </span>
      ),
    },
    {
      title: "名称",
      dataIndex: "name",
      key: "name",
      ellipsis: true,
      minWidth: 160,
    },
    {
      title: "规模（亿元）",
      dataIndex: "aumYi",
      key: "aumYi",
      align: "right",
      width: 112,
      render: (v: number | null) => (
        <span className="font-mono tabular-nums">{fmtYi(v)}</span>
      ),
    },
    {
      title: "管理费率",
      dataIndex: "expenseRatio",
      key: "expenseRatio",
      align: "right",
      width: 104,
      render: (v: number | null) => (
        <span className="font-mono tabular-nums">{fmtPctRatio(v)}</span>
      ),
    },
    {
      title: "近 N 日日均成交额（亿元）",
      dataIndex: "avgDailyTurnoverYi",
      key: "avgDailyTurnoverYi",
      align: "right",
      width: 168,
      render: (v: number | null) => (
        <span className="font-mono tabular-nums">{fmtYi(v)}</span>
      ),
    },
    {
      title: "折溢价率",
      dataIndex: "premiumDiscount",
      key: "premiumDiscount",
      align: "right",
      width: 96,
      render: (v: number | null) => (
        <span className="font-mono tabular-nums">{fmtPctPoints(v)}</span>
      ),
    },
    {
      title: "跟踪误差（年化近似）",
      dataIndex: "trackingError",
      key: "trackingError",
      align: "right",
      width: 136,
      render: (v: number | null) => (
        <span className="font-mono tabular-nums">{fmtPctPoints(v)}</span>
      ),
    },
    {
      title: "",
      key: "copy",
      fixed: "right",
      width: 72,
      render: (_: unknown, row: TrackingEtfRow) => (
        <Button
          type="text"
          size="small"
          aria-label={`复制 ${row.code}`}
          icon={<CopyOutlined />}
          onClick={() => {
            void navigator.clipboard.writeText(row.code).then(() => {
              message.success(`已复制 ${row.code}`);
            });
          }}
        />
      ),
    },
  ];

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-[color:var(--border-color)] bg-[var(--correlation-card-tint)] px-6 py-10 text-center text-sm text-[var(--muted-foreground)]">
        暂无跟踪 ETF 数据（MOCK 空映射演练）
      </div>
    );
  }

  return (
    <div className="indices-table-wrap overflow-x-auto rounded-xl border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)]">
      <Table<TrackingEtfRow>
        size="middle"
        rowKey={(r) => r.code}
        pagination={false}
        columns={columns}
        dataSource={sorted}
        scroll={{ x: "max-content" }}
      />
    </div>
  );
}
