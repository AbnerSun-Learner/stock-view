import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";

export const metadata: Metadata = {
  title: "行情中心 · 机构级看盘布局演示 · Stillwell",
  description:
    "三栏模块化金融市场中心示意：侧边导航、主要指数微型图与高密度排行表。",
};

interface SparklineSeries {
  pts: readonly number[];
  stroke?: string;
}

function Sparkline({ pts, stroke = "#1e4f7d" }: SparklineSeries) {
  if (!pts.length) return null;

  const w = 160;
  const h = 40;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const pad = max === min ? 1 : 0;
  const lo = min - pad;
  const hi = max + pad;
  const coords = pts.map((y, i) => {
    const x = pts.length <= 1 ? w / 2 : (i / (pts.length - 1)) * w;
    const t = (y - lo) / (hi - lo || 1);
    const py = h - t * (h - 4) - 2;
    return `${x.toFixed(1)},${py.toFixed(1)}`;
  });
  const d = `M ${coords.join(" L ")}`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-9 w-full max-w-[10rem] shrink-0"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={1.25}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

const NAV = [
  { label: "行情", href: "#", active: true },
  { label: "自选", href: "#watch" },
  { label: "基金", href: "/grid" },
  { label: "指数对比", href: "/correlation" },
  { label: "投研", href: "/#about" },
] as const;

const INDICES = [
  {
    name: "上证指数",
    code: "000001.SH",
    value: "3 856.42",
    change: "+1.08%",
    up: true,
    pts: [
      3810, 3814, 3807, 3819, 3824, 3818, 3831, 3842, 3835, 3848, 3850, 3856,
    ],
  },
  {
    name: "深证成指",
    code: "399001.SZ",
    value: "12 104.73",
    change: "+0.64%",
    up: true,
    pts: [11990, 12005, 11970, 12020, 12045, 12030, 12055, 12080, 12065, 12095],
  },
  {
    name: "创业板指",
    code: "399006.SZ",
    value: "2 018.93",
    change: "-0.21%",
    up: false,
    pts: [2035, 2030, 2028, 2025, 2022, 2019, 2020, 2017, 2016, 2018, 2019],
  },
  {
    name: "沪深300",
    code: "000300.SH",
    value: "4 512.08",
    change: "+0.92%",
    up: true,
    pts: [4460, 4468, 4455, 4472, 4480, 4474, 4488, 4495, 4490, 4505, 4512],
  },
] as const;

const GAINERS = [
  { name: "平安银行", code: "000001", price: "12.86", pct: "+6.12%" },
  { name: "泸州老窖", code: "000568", price: "142.30", pct: "+5.04%" },
  { name: "宁德时代", code: "300750", price: "189.20", pct: "+4.88%" },
  { name: "紫金矿业", code: "601899", price: "17.45", pct: "+4.21%" },
  { name: "招商银行", code: "600036", price: "35.62", pct: "+3.95%" },
  { name: "比亚迪", code: "002594", price: "248.00", pct: "+3.72%" },
  { name: "海康威视", code: "002415", price: "31.28", pct: "+3.41%" },
  { name: "贵州茅台", code: "600519", price: "1 685.00", pct: "+2.98%" },
] as const;

const LOSERS = [
  { name: "中国石油", code: "601857", price: "8.42", pct: "-2.15%" },
  { name: "中国建筑", code: "601668", price: "5.18", pct: "-1.89%" },
  { name: "工商银行", code: "601398", price: "5.63", pct: "-1.54%" },
  { name: "农业银行", code: "601288", price: "3.91", pct: "-1.31%" },
  { name: "中国电信", code: "601728", price: "6.05", pct: "-1.14%" },
  { name: "中国神华", code: "601088", price: "39.20", pct: "-0.98%" },
  { name: "长江电力", code: "600900", price: "28.14", pct: "-0.86%" },
  { name: "中国中免", code: "601888", price: "72.55", pct: "-0.72%" },
] as const;

export default function MarketCenterPage() {
  return (
    <div
      className="market-center-shell min-h-screen flex flex-col lg:flex-row bg-[#FFFFFF] text-[#333]"
      style={
        {
          fontFamily:
            'var(--font-inter), var(--font-noto-sans-sc), "PingFang SC", "Microsoft YaHei", sans-serif',
        } as CSSProperties
      }
    >
      {/* ── Left rail ─────────────────────────────────────── */}
      <aside className="flex lg:flex-col lg:w-[200px] shrink-0 border-b lg:border-b-0 lg:border-r border-[#E8E8E8] bg-[#F5F5F5]">
        <div className="flex lg:flex-col items-center lg:items-stretch gap-2 lg:gap-0 px-3 py-3 lg:py-6 lg:px-4">
          <div className="hidden lg:flex items-center gap-2 pb-6 border-b border-[#E8E8E8] mb-2">
            <span
              className="nav-brand-en text-[15px] leading-none whitespace-nowrap"
              style={{ color: "#122a43" }}
            >
              Stillwell
            </span>
            <span className="font-en-arial text-[10px] font-medium uppercase tracking-wider text-[#6b7280]">
              MKT
            </span>
          </div>

          <nav className="flex lg:flex-col gap-0.5 flex-1 overflow-x-auto lg:overflow-visible [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {NAV.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`shrink-0 lg:w-full px-3 py-2 text-[13px] border border-transparent lg:border-none rounded-none transition-colors duration-150
                  ${
                    "active" in item && item.active
                      ? "bg-white text-[#122a43] font-semibold border-[#E8E8E8] lg:border lg:border-[#E8E8E8]"
                      : "text-[#5c6370] hover:bg-white/80 hover:text-[#122a43]"
                  }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      <div className="flex flex-1 min-h-0 min-w-0 flex-col xl:flex-row">
        {/* ── Center column ──────────────────────────────── */}
        <main className="flex-1 flex flex-col min-w-0 border-b xl:border-b-0 xl:border-r border-[#E8E8E8]">
          <header className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-[#E8E8E8] bg-[#FFFFFF]">
            <div>
              <h1 className="text-[15px] sm:text-[16px] font-semibold tracking-tight leading-tight text-[#122a43]">
                金融市场行情中心
              </h1>
              <p className="text-[11px] text-[#797c86] mt-0.5">
                高密度机构终端布局 · A 股示意数据
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end font-mono text-[11px] text-[#5c6370]">
              <span className="tabular-nums">
                {new Intl.DateTimeFormat("zh-CN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date())}
              </span>
              <span className="hidden sm:inline px-2 py-0.5 border border-[#E8E8E8] bg-[#FAFAFA] tabular-nums">
                交易日
              </span>
            </div>
          </header>

          <div className="px-4 sm:px-6 py-4 space-y-4 flex-1">
            <section aria-label="主要指数">
              <div className="flex items-baseline justify-between mb-2">
                <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                  主要指数
                </h2>
                <span className="text-[10px] text-[#9ca3af]">
                  微型走势 · 等宽数字
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-px bg-[#E8E8E8] border border-[#E8E8E8]">
                {INDICES.map((ix) => (
                  <article
                    key={ix.code}
                    className="bg-[#FFFFFF] p-4 flex flex-col gap-3 transition-colors duration-150 hover:bg-[#FAFAFA] cursor-default"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-[13px] font-semibold text-[#1f2937] leading-snug">
                          {ix.name}
                        </h3>
                        <p className="text-[11px] text-[#9ca3af] font-mono tabular-nums mt-0.5">
                          {ix.code}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-end justify-between gap-3">
                      <p className="text-[26px] sm:text-[28px] font-semibold tracking-tight text-[#111827] font-mono tabular-nums leading-none">
                        {ix.value}
                      </p>
                      <Sparkline pts={[...ix.pts]} stroke="#315e8f" />
                    </div>
                    <p
                      className={`text-[14px] font-mono tabular-nums font-semibold ${
                        ix.up ? "text-[#E33535]" : "text-[#1EA05D]"
                      }`}
                    >
                      {ix.change}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section aria-label="A 股涨跌榜" className="pb-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                  A 股排行
                </h2>
                <Link
                  href="/"
                  className="text-[11px] font-medium hover:underline"
                  style={{ color: "#215a8a" }}
                >
                  返回首页 →
                </Link>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="border border-[#E8E8E8] overflow-hidden">
                  <div className="px-3 py-2 border-b border-[#E8E8E8] bg-[#FAFAFA] flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-[#374151]">
                      涨幅榜
                    </span>
                    <span className="text-[11px] text-[#E33535] font-mono font-medium">
                      红涨示意
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[12px] font-mono tabular-nums">
                      <thead>
                        <tr className="text-[11px] text-[#6b7280] border-b border-[#E8E8E8] bg-[#FFFFFF]">
                          <th className="font-medium px-3 py-2 whitespace-nowrap">
                            名称
                          </th>
                          <th className="font-medium px-3 py-2 whitespace-nowrap">
                            代码
                          </th>
                          <th className="font-medium px-3 py-2 whitespace-nowrap text-right">
                            现价
                          </th>
                          <th className="font-medium px-3 py-2 whitespace-nowrap text-right">
                            涨跌幅
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {GAINERS.map((row) => (
                          <tr
                            key={row.code}
                            className="border-b border-[#E8E8E8] transition-colors hover:bg-[#F9FAFB] last:border-b-0"
                          >
                            <td className="px-3 py-1.5 text-[#111827] whitespace-nowrap">
                              <span className="font-sans font-medium">
                                {row.name}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-[#6b7280]">
                              {row.code}
                            </td>
                            <td className="px-3 py-1.5 text-right">
                              {row.price}
                            </td>
                            <td className="px-3 py-1.5 text-right font-semibold text-[#E33535]">
                              {row.pct}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="border border-[#E8E8E8] overflow-hidden">
                  <div className="px-3 py-2 border-b border-[#E8E8E8] bg-[#FAFAFA] flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-[#374151]">
                      跌幅榜
                    </span>
                    <span className="text-[11px] text-[#1EA05D] font-mono font-medium">
                      绿跌示意
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[12px] font-mono tabular-nums">
                      <thead>
                        <tr className="text-[11px] text-[#6b7280] border-b border-[#E8E8E8] bg-[#FFFFFF]">
                          <th className="font-medium px-3 py-2 whitespace-nowrap">
                            名称
                          </th>
                          <th className="font-medium px-3 py-2 whitespace-nowrap">
                            代码
                          </th>
                          <th className="font-medium px-3 py-2 whitespace-nowrap text-right">
                            现价
                          </th>
                          <th className="font-medium px-3 py-2 whitespace-nowrap text-right">
                            涨跌幅
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {LOSERS.map((row) => (
                          <tr
                            key={row.code}
                            className="border-b border-[#E8E8E8] transition-colors hover:bg-[#F9FAFB] last:border-b-0"
                          >
                            <td className="px-3 py-1.5 text-[#111827] whitespace-nowrap">
                              <span className="font-sans font-medium">
                                {row.name}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-[#6b7280]">
                              {row.code}
                            </td>
                            <td className="px-3 py-1.5 text-right">
                              {row.price}
                            </td>
                            <td className="px-3 py-1.5 text-right font-semibold text-[#1EA05D]">
                              {row.pct}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>

        {/* ── Right rail ─────────────────────────────────── */}
        <aside
          id="watch"
          className="w-full xl:w-[240px] shrink-0 bg-[#FFFFFF] flex flex-col scroll-mt-14"
        >
          <div className="px-4 sm:px-5 py-3 border-b border-[#E8E8E8]">
            <h2 className="text-[12px] font-semibold text-[#122a43] tracking-tight">
              快捷面板
            </h2>
            <p className="text-[11px] text-[#9ca3af] mt-1">盘口信息补充位</p>
          </div>
          <div className="p-4 sm:p-5 space-y-4 flex-1">
            <section className="border border-[#E8E8E8] p-3 space-y-2">
              <h3 className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">
                市场概览
              </h3>
              <dl className="space-y-2 text-[12px]">
                <div className="flex justify-between gap-2">
                  <dt className="text-[#6b7280]">涨跌家数</dt>
                  <dd className="font-mono tabular-nums text-[#111827]">
                    涨 <span className="text-[#E33535]">3 842</span> / 跌{" "}
                    <span className="text-[#1EA05D]">987</span>
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[#6b7280]">成交额</dt>
                  <dd className="font-mono tabular-nums text-[#111827]">
                    1.08 万亿
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[#6b7280]">北向资金</dt>
                  <dd className="font-mono tabular-nums text-[#E33535]">
                    +62.34 亿
                  </dd>
                </div>
              </dl>
            </section>

            <section>
              <h3 className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide mb-2">
                工具入口
              </h3>
              <ul className="border border-[#E8E8E8] divide-y divide-[#E8E8E8] text-[12px]">
                <li>
                  <Link
                    href="/grid"
                    className="block px-3 py-2 hover:bg-[#F9FAFB] transition-colors text-[#374151]"
                  >
                    网格交易计算器
                  </Link>
                </li>
                <li>
                  <Link
                    href="/correlation"
                    className="block px-3 py-2 hover:bg-[#F9FAFB] transition-colors text-[#374151]"
                  >
                    指数持仓对比
                  </Link>
                </li>
              </ul>
            </section>

            <p className="text-[10px] leading-relaxed text-[#9ca3af] pt-2">
              本页为高保真布局演示；行情数据为占位，非实时行情源。
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
