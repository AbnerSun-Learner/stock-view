"use client";

import type {
  IndustryCompositionByLevel,
  IndustryWeightRow,
} from "@/types/indices";
import { Segmented, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo, useState } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface DonutTooltipProps {
  active?: boolean;
  payload?: readonly { name?: unknown; value?: unknown }[];
}

type SwLevel = "sw1" | "sw2" | "sw3";

const SW_LABELS: Record<SwLevel, string> = {
  sw1: "申万一级",
  sw2: "申万二级",
  sw3: "申万三级",
};

const PIE_PALETTE = [
  "color-mix(in srgb, var(--correlation-brand) 92%, transparent)",
  "color-mix(in srgb, var(--correlation-brand) 72%, transparent)",
  "color-mix(in srgb, var(--correlation-brand) 52%, transparent)",
  "color-mix(in srgb, #0d9488 55%, transparent)",
  "color-mix(in srgb, #9a3412 55%, transparent)",
  "color-mix(in srgb, #6b21a8 48%, transparent)",
  "color-mix(in srgb, var(--muted-foreground) 55%, transparent)",
];

function DonutTooltip({ active, payload }: DonutTooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const name = String(p.name ?? "");
  const v = p.value as number | undefined;
  if (v === undefined) return null;
  return (
    <div className="indices-chart-tooltip rounded-lg px-3 py-2 text-xs border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] shadow-md">
      <p className="text-[var(--foreground)] font-medium">{name}</p>
      <p className="font-mono tabular-nums text-[var(--muted-foreground)] mt-1">
        权重 {v.toFixed(1)}%
      </p>
    </div>
  );
}

interface IndexIndustryCompositionProps {
  data: IndustryCompositionByLevel;
}

export function IndexIndustryComposition({
  data,
}: IndexIndustryCompositionProps) {
  const [level, setLevel] = useState<SwLevel>("sw1");

  const rows: IndustryWeightRow[] = useMemo(() => {
    return data[level] ?? [];
  }, [data, level]);

  const pieData = useMemo(
    () =>
      rows.map((r) => ({
        name: r.name,
        value: r.weightPct,
      })),
    [rows]
  );

  const columns: ColumnsType<IndustryWeightRow> = useMemo(
    () => [
      {
        title: `${SW_LABELS[level]}名称`,
        dataIndex: "name",
        key: "name",
        ellipsis: { showTitle: true },
      },
      {
        title: "权重占比",
        dataIndex: "weightPct",
        key: "weightPct",
        align: "right",
        render: (v: number) => (
          <span className="font-mono tabular-nums">{v.toFixed(1)}%</span>
        ),
      },
    ],
    [level]
  );

  return (
    <section className="rounded-xl border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] p-5 md:p-6 space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-medium text-[var(--foreground)] tracking-wide">
            行业主营构成（申万）
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            MOCK 占位：切换级别后环形图与下表字段名同步切换。
          </p>
        </div>
        <Segmented<SwLevel>
          options={[
            { label: "申万一级", value: "sw1" },
            { label: "申万二级", value: "sw2" },
            { label: "申万三级", value: "sw3" },
          ]}
          value={level}
          onChange={setLevel}
          className="self-start md:self-auto"
        />
      </div>

      {pieData.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          暂无行业拆解数据。
        </p>
      ) : (
        <>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%" debounce={50}>
              <PieChart margin={{ top: 4, bottom: 4, left: 4, right: 4 }}>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="54%"
                  outerRadius="76%"
                  paddingAngle={2}
                  stroke="var(--border-color)"
                  strokeWidth={1}
                  isAnimationActive={false}
                >
                  {pieData.map((_, i) => (
                    <Cell
                      key={`c-${level}-${i}`}
                      fill={PIE_PALETTE[i % PIE_PALETTE.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<DonutTooltip />} />
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(v) => (
                    <span className="text-[var(--muted-foreground)]">{v}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="indices-table-wrap overflow-x-auto -mx-1 sm:mx-0 rounded-lg border border-[color:var(--border-color)] bg-[var(--correlation-card-tint)] px-2 py-3 sm:p-0 sm:border-none sm:bg-transparent">
            <Table<IndustryWeightRow>
              rowKey={(r, i) => `${r.name}-${i}`}
              columns={columns}
              dataSource={rows}
              size="middle"
              pagination={false}
              className="industry-sw-table [&_.ant-table]:bg-transparent"
            />
          </div>
        </>
      )}
    </section>
  );
}
