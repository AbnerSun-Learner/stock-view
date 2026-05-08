"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

// ── 工具数据（对应参考页的 Selected Work 卡片）
const TOOLS = [
  {
    num: "01",
    title: "网格交易",
    sub: "Grid Trading",
    desc: "智能参数计算，三级分层网格自动生成，资金占用与收益率实时压力测试",
    tags: ["策略计算", "ETF / LOF"],
    href: "/grid",
  },
  {
    num: "02",
    title: "指数估值",
    sub: "Index Valuation",
    desc: "覆盖 20+ 宽基指数，PE/PB 双维度历史百分位，绿低估黄合理红高估",
    tags: ["估值分析", "A 股指数"],
    href: "/valuation",
  },
  {
    num: "03",
    title: "PE 分位数",
    sub: "PE Percentile",
    desc: "基于十年历史市盈率序列，自动计算当前 PE 在历史区间中的精确排名",
    tags: ["市盈率", "10 年历史"],
    href: "/valuation",
  },
  {
    num: "04",
    title: "PB 分位数",
    sub: "PB Percentile",
    desc: "市净率历史分位数，配合 PE 形成双维度估值判断，降低单指标误判风险",
    tags: ["市净率", "全区间"],
    href: "/valuation",
  },
  {
    num: "05",
    title: "压力测试",
    sub: "Stress Test",
    desc: "模拟标的从基准价下跌至最低价，全档位触发时的资金占用与综合收益率",
    tags: ["风险评估", "全档位"],
    href: "/grid",
  },
  {
    num: "06",
    title: "ETF 相关性",
    sub: "ETF Correlation",
    desc: "走势同向性 + 底层成分重叠双信号，量化你的 ETF 持仓是否存在被忽略的重复风险",
    tags: ["分散度", "持仓体检"],
    href: "/correlation",
  },
];

// ── About 右侧 Key Facts
const FACTS = [
  { label: "数据区间", value: "2014 年至今" },
  { label: "覆盖指数", value: "20+ 宽基 / 行业指数" },
  { label: "更新频率", value: "交易日自动更新" },
  { label: "账户要求", value: "无需注册，完全免费" },
  { label: "计算方式", value: "100% 本地，无服务依赖" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f5f5f5] text-neutral-900 font-sans">
      {/* ── Navigation ─────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#f5f5f5] border-b border-neutral-200">
        <div className="flex items-center justify-between mx-auto max-w-6xl px-6 lg:px-10 h-[72px]">
          <Link
            href="/"
            className="text-xs font-semibold tracking-[0.18em] uppercase text-neutral-900 hover:opacity-60 transition-opacity duration-150"
          >
            Stillwell
          </Link>
          <nav className="flex items-center gap-8">
            <Link
              href="/grid"
              className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors duration-150"
            >
              网格交易
            </Link>
            <Link
              href="/valuation"
              className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors duration-150"
            >
              指数估值
            </Link>
            <Link
              href="/correlation"
              className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors duration-150"
            >
              相关性
            </Link>
            <a
              href="#about"
              className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors duration-150"
            >
              关于
            </a>
          </nav>
        </div>
      </header>

      <main>
        {/* ── Hero ──────────────────────────────────────────── */}
        <section className="pt-40 pb-12 mx-auto max-w-6xl px-6 lg:px-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-400 mb-4">
            Stillwell · ETF Research
          </p>
          <h1 className="pf-hero-title landing-hero-title mb-6 max-w-4xl">
            专注 <em>ETF 与指数基金</em>
            <br />
            的投研与工具
          </h1>
          <p className="landing-hero-title text-xl sm:text-2xl font-light text-neutral-800 tracking-[0.02em] max-w-[52ch] mb-5 leading-snug">
            涨跌有常，策略在心
          </p>
          <p className="text-base text-neutral-500 leading-[1.7] max-w-[52ch] mb-3">
            以指数为锚、以数据为界：用可验证的估值、持仓与策略计算，帮你在噪声里把
            ETF
            投资看得更清楚。投研相关能力将持续迭代，当前可先使用下方基础工具。
          </p>
          <p className="text-[10px] text-neutral-400 leading-relaxed max-w-[52ch] font-light uppercase tracking-[0.12em]">
            Still in volatility, rich in time.
          </p>
        </section>

        {/* 水平分隔线（对应参考的 HR） */}
        <div className="mx-auto max-w-6xl px-6 lg:px-10">
          <div className="h-px bg-neutral-200" />
        </div>

        {/* ── Selected Work（基础工具） ──────────────────────── */}
        <section className="py-16 mx-auto max-w-6xl px-6 lg:px-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-400 mb-3">
            Tools · 基础工具
          </p>
          <p className="text-xs text-neutral-500 leading-[1.7] max-w-[60ch] mb-8">
            已上线的本地计算与指数数据能力，可与后续投研模块搭配使用。
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {TOOLS.map((tool) => (
              <Link key={tool.num} href={tool.href} className="group block">
                <article className="bg-white border border-neutral-200 flex flex-col cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:border-neutral-400">
                  {/* 序号区域（对应参考大号灰色数字） */}
                  <div className="flex items-center justify-center h-36 border-b border-neutral-100">
                    <span className="text-[5rem] font-light leading-none text-neutral-100 select-none tracking-[-0.04em] group-hover:text-neutral-200 transition-colors duration-150">
                      {tool.num}
                    </span>
                  </div>

                  {/* 卡片信息 */}
                  <div className="p-5 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-medium text-neutral-900 leading-snug">
                          {tool.title}
                        </h3>
                        <p className="text-[10px] font-medium text-neutral-400 mt-0.5 font-mono uppercase tracking-[0.06em]">
                          {tool.sub}
                        </p>
                      </div>
                      <ArrowUpRight
                        className="w-3.5 h-3.5 text-neutral-300 group-hover:text-neutral-600 transition-colors duration-150 flex-shrink-0 mt-0.5"
                        strokeWidth={1.5}
                      />
                    </div>

                    <p className="text-xs text-neutral-500 leading-[1.7]">
                      {tool.desc}
                    </p>

                    {/* 标签 */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {tool.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.06em] border border-neutral-200 text-neutral-500"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </section>

        {/* 水平分隔线 */}
        <div className="mx-auto max-w-6xl px-6 lg:px-10">
          <div className="h-px bg-neutral-200" />
        </div>

        {/* ── About ─────────────────────────────────────────── */}
        <section
          id="about"
          className="scroll-mt-24 py-16 mx-auto max-w-6xl px-6 lg:px-10"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-20">
            {/* 左：介绍文字 */}
            <div className="lg:col-span-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-400 mb-6">
                About
              </p>
              <div className="space-y-4 text-sm text-neutral-600 leading-[1.75] max-w-[52ch]">
                <p>
                  Stillwell 面向国内个人投资者，聚焦 ETF
                  与指数基金的投研与交易辅助。我们相信好的决策来自可追溯的数据与逻辑，而不是模糊的感觉。
                </p>
                <p>
                  名称里的 still
                  well，想表达的是：行情再大起大落，只要目标和策略清楚，心里就有底。用投研把
                  ETF 与指数看清楚，就是为了在波动里仍能坚持自己的节奏。
                </p>
                <p>
                  主打 ETF
                  投研模块将随功能迭代陆续开放；当前你可使用网格参数计算、指数估值分位、持仓与行业分布等基础能力。我们只呈现模型与事实，投资决策始终由你自己做出。
                </p>
                <p className="text-neutral-900 font-medium">
                  涨跌有常，策略在心。
                </p>
              </div>
            </div>

            {/* 右：Key Facts */}
            <div className="lg:col-span-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-400 mb-6">
                Key Facts
              </p>
              <div className="divide-y divide-neutral-200">
                {FACTS.map((f) => (
                  <div
                    key={f.label}
                    className="flex items-baseline justify-between py-3.5 gap-6"
                  >
                    <span className="text-[10px] uppercase tracking-[0.1em] text-neutral-400 flex-shrink-0">
                      {f.label}
                    </span>
                    <span className="text-sm text-neutral-900 text-right">
                      {f.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 水平分隔线 */}
        <div className="mx-auto max-w-6xl px-6 lg:px-10">
          <div className="h-px bg-neutral-200" />
        </div>

        {/* ── Contact / CTA ─────────────────────────────────── */}
        <section className="py-16 mx-auto max-w-6xl px-6 lg:px-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-400 mb-6">
            Start Now
          </p>
          <h2 className="text-2xl md:text-3xl font-light tracking-[-0.02em] text-neutral-900 mb-8 max-w-xl leading-snug">
            立即开始：无需注册，
            <br />
            核心数据与计算在本地完成。
          </h2>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/grid">
              <button className="inline-flex items-center gap-2 border border-neutral-900 text-neutral-900 bg-transparent px-5 py-2.5 text-sm font-medium hover:bg-neutral-900 hover:text-white transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900">
                进入网格交易
                <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            </Link>
            <Link href="/valuation">
              <button className="inline-flex items-center gap-2 border border-neutral-300 text-neutral-600 bg-transparent px-5 py-2.5 text-sm font-medium hover:border-neutral-900 hover:text-neutral-900 transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400">
                查看指数估值
              </button>
            </Link>
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-neutral-200 py-5 mx-auto max-w-6xl px-6 lg:px-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-neutral-400">
            © {new Date().getFullYear()} Stillwell
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="/grid"
              className="text-xs text-neutral-400 hover:text-neutral-900 transition-colors duration-150"
            >
              网格交易
            </Link>
            <Link
              href="/valuation"
              className="text-xs text-neutral-400 hover:text-neutral-900 transition-colors duration-150"
            >
              指数估值
            </Link>
            <Link
              href="/correlation"
              className="text-xs text-neutral-400 hover:text-neutral-900 transition-colors duration-150"
            >
              ETF 相关性
            </Link>
            <a
              href="#about"
              className="text-xs text-neutral-400 hover:text-neutral-900 transition-colors duration-150"
            >
              关于
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
