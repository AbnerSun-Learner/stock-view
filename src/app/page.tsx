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
    title: "持仓分析",
    sub: "Holdings",
    desc: "指数前十大成分股权重与申万一级行业分布，快速了解指数真实暴露",
    tags: ["成分股", "行业分布"],
    href: "/valuation",
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
        <section className="pt-40 pb-16 mx-auto max-w-6xl px-6 lg:px-10">
          <h1 className="pf-hero-title mb-5 max-w-3xl">
            Still in <em>Volatility</em>,
            <br />
            Rich in Time.
          </h1>
          <p className="text-base text-neutral-500 leading-[1.7] max-w-[50ch]">
            以十年中值为锚，历史高低为界。网格策略计算与估值分位参考，帮你在市场噪音中保持清醒。
          </p>
        </section>

        {/* 水平分隔线（对应参考的 HR） */}
        <div className="mx-auto max-w-6xl px-6 lg:px-10">
          <div className="h-px bg-neutral-200" />
        </div>

        {/* ── Selected Work（核心工具） ──────────────────────── */}
        <section className="py-16 mx-auto max-w-6xl px-6 lg:px-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-400 mb-8">
            Core Tools
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
        <section id="about" className="py-16 mx-auto max-w-6xl px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-20">
            {/* 左：介绍文字 */}
            <div className="lg:col-span-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-400 mb-6">
                About
              </p>
              <div className="space-y-4 text-sm text-neutral-600 leading-[1.75] max-w-[52ch]">
                <p>
                  Stillwell 是一款面向 A
                  股指数投资者的量化工具。我们相信，好的决策来自清晰的数据，而不是模糊的感觉。
                </p>
                <p>
                  无论是网格买卖点的精确计算，还是 PE/PB
                  历史分位数的估值参考，Stillwell
                  只提供数字与逻辑，决策权始终属于你自己。
                </p>
                <p className="text-neutral-900 font-medium">
                  慢即是快，稳即是远。
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
          <h2 className="text-2xl md:text-3xl font-light tracking-[-0.02em] text-neutral-900 mb-8 max-w-lg leading-snug">
            立即开始，无需注册，
            <br />
            数据本地计算。
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
