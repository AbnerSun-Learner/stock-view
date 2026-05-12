"use client";

import { StillwellSiteNav } from "@/components/stillwell-site-nav";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

const easeOut = [0.16, 1, 0.3, 1] as const;

const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: easeOut },
  },
};

const innerStagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

interface ToolItem {
  num: string;
  title: string;
  sub: string;
  desc: string;
  tags: readonly string[];
  href: string;
  featured?: boolean;
}

const TOOLS: ToolItem[] = [
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
    title: "压力测试",
    sub: "Stress Test",
    desc: "模拟标的从基准价下跌至最低价，全档位触发时的资金占用与综合收益率",
    tags: ["风险评估", "全档位"],
    href: "/grid",
  },
  {
    num: "03",
    title: "指数对比",
    sub: "Index Comparison",
    desc: "涨跌联动与底层成分重叠双信号，检视两只指数基金标的是否重合度过高、分散不足",
    tags: ["分散度", "持仓体检"],
    href: "/correlation",
    featured: true,
  },
];

const FACTS = [
  { label: "数据区间", value: "2014 年至今" },
  { label: "工具类型", value: "网格策略 · 指数对比" },
  { label: "更新频率", value: "交易日自动更新" },
  { label: "账户要求", value: "无需注册，完全免费" },
  { label: "计算方式", value: "100% 本地，无服务依赖" },
];

function SectionLabel({ text, onDark }: { text: string; onDark?: boolean }) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className={`ds-section-label ${
        onDark ? "ds-section-label--on-dark" : ""
      }`}
    >
      {reduceMotion ? (
        <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" />
      ) : (
        <motion.span
          className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]"
          aria-hidden
          animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <span className="ds-section-label__text">{text}</span>
    </div>
  );
}

function HeroGraphic() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative hidden min-h-[380px] h-[min(520px,70vh)] items-center justify-center lg:flex">
      <div
        className="pointer-events-none absolute inset-0 rounded-[2rem] bg-[radial-gradient(ellipse_at_30%_20%,color-mix(in_srgb,var(--accent)_12%,transparent)_0%,transparent_55%),radial-gradient(ellipse_at_80%_70%,color-mix(in_srgb,var(--accent-secondary)_10%,transparent)_0%,transparent_50%)]"
        aria-hidden
      />
      <motion.div
        className="absolute h-[min(360px,48vw)] w-[min(360px,48vw)] rounded-full border border-dashed border-[color-mix(in_srgb,var(--accent)_28%,var(--border))]"
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={
          reduceMotion
            ? undefined
            : { duration: 60, repeat: Infinity, ease: "linear" }
        }
        aria-hidden
      />
      <motion.div
        className="relative z-[1] w-[min(280px,32vw)] rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--ds-shadow-xl)]"
        animate={
          reduceMotion
            ? undefined
            : { y: [0, -10, 0], rotate: [-1.2, 0.8, -1.2] }
        }
        transition={
          reduceMotion
            ? undefined
            : { duration: 5, repeat: Infinity, ease: "easeInOut" }
        }
      >
        <div className="mb-4 flex gap-2">
          <span className="h-9 w-9 shrink-0 rounded-xl bg-[linear-gradient(135deg,var(--accent),var(--accent-secondary))] shadow-[var(--shadow-accent)]" />
          <div className="flex flex-1 flex-col justify-center gap-1.5">
            <span className="h-2 w-3/5 rounded bg-[var(--muted)]" />
            <span className="h-2 w-2/5 rounded bg-[var(--border)]" />
          </div>
        </div>
        <div className="mb-4 grid grid-cols-3 gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <span
              key={i}
              className="aspect-square rounded-md bg-[var(--muted)]"
            />
          ))}
        </div>
        <div className="h-2.5 w-24 rounded bg-[linear-gradient(90deg,var(--accent),var(--accent-secondary))] opacity-90" />
      </motion.div>
      <motion.div
        className="absolute bottom-[14%] right-[8%] z-[2] w-[min(200px,22vw)] rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_96%,transparent)] p-4 shadow-[var(--shadow-accent)] backdrop-blur-[6px]"
        animate={reduceMotion ? undefined : { y: [0, 8, 0] }}
        transition={
          reduceMotion
            ? undefined
            : { duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.4 }
        }
      >
        <p className="font-en-arial text-[10px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
          Live
        </p>
        <p className="font-en-arial mt-1 text-lg font-semibold leading-snug tracking-tight text-[var(--foreground)]">
          ETF Core
        </p>
      </motion.div>
    </div>
  );
}

function ToolCardArticle({
  tool,
  featuredInner,
}: {
  tool: ToolItem;
  featuredInner: boolean;
}) {
  const r = featuredInner ? "rounded-[0.875rem]" : "rounded-2xl";

  return (
    <article
      className={`relative flex h-full min-h-[280px] flex-col overflow-hidden border border-[var(--border)] bg-[var(--card)] ${r} ${
        featuredInner
          ? "border-0 shadow-none"
          : "shadow-[var(--ds-shadow-md)] transition-[transform,box-shadow] duration-300 group-hover:-translate-y-1 group-hover:shadow-[var(--ds-shadow-xl)]"
      }`}
    >
      <div
        className={`pointer-events-none absolute inset-0 z-[1] ${r} bg-gradient-to-br from-[color-mix(in_srgb,var(--accent)_4%,transparent)] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
        aria-hidden
      />
      <div className="relative z-[2] flex min-h-0 flex-1 flex-col">
        <div className="relative flex h-36 items-center justify-center border-b border-[var(--border)] bg-[linear-gradient(165deg,color-mix(in_srgb,var(--accent)_5%,var(--card))_0%,var(--card)_100%)] transition-[background] duration-300 group-hover:bg-[linear-gradient(165deg,color-mix(in_srgb,var(--accent)_10%,var(--card))_0%,var(--card)_100%)]">
          <span className="select-none text-[5rem] font-light leading-none tracking-[-0.04em] text-[var(--border)] transition-[transform,colors] duration-300 group-hover:scale-[1.02] group-hover:text-[color-mix(in_srgb,var(--accent)_25%,var(--border))]">
            {tool.num}
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-3 p-6">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold leading-snug tracking-tight text-[var(--foreground)]">
                {tool.title}
              </h3>
              <p className="mt-0.5 font-en-arial text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
                {tool.sub}
              </p>
            </div>
            <ArrowUpRight
              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted-foreground)] transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-0.5 group-hover:text-[var(--accent)]"
              strokeWidth={1.5}
            />
          </div>
          <p className="text-sm leading-[1.7] text-[var(--muted-foreground)]">
            {tool.desc}
          </p>
          <div className="mt-auto flex flex-wrap gap-2 pt-1">
            {tool.tags.map((tag) => (
              <span
                key={tag}
                className="font-en-arial inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function ToolCard({ tool }: { tool: ToolItem }) {
  if (tool.featured) {
    return (
      <Link href={tool.href} className="group block h-full">
        <div className="rounded-2xl bg-gradient-to-br from-[var(--accent)] via-[var(--accent-secondary)] to-[var(--accent)] p-[2px] shadow-[var(--shadow-accent)] transition-[transform,box-shadow] duration-300 group-hover:-translate-y-1 group-hover:shadow-[var(--shadow-accent-lg)]">
          <ToolCardArticle tool={tool} featuredInner />
        </div>
      </Link>
    );
  }

  return (
    <Link href={tool.href} className="group block h-full">
      <ToolCardArticle tool={tool} featuredInner={false} />
    </Link>
  );
}

export default function LandingPage() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans">
      <StillwellSiteNav
        trailing={
          <nav
            className="flex flex-wrap items-center justify-end gap-x-5 gap-y-1 sm:gap-x-6"
            aria-label="站内导航"
          >
            {[
              ["行情中心", "/indices"],
              ["网格交易", "/grid"],
              ["指数对比", "/correlation"],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="text-sm text-[var(--muted-foreground)] transition-colors duration-200 hover:text-[var(--accent)]"
              >
                {label}
              </Link>
            ))}
            <a
              href="#about"
              className="text-sm text-[var(--muted-foreground)] transition-colors duration-200 hover:text-[var(--accent)]"
            >
              关于
            </a>
          </nav>
        }
      />

      <main>
        {/* Hero：1.1fr / 0.9fr · 展示标题比例与氛围光 */}
        <motion.section
          className="relative isolate mx-auto max-w-6xl px-6 pb-20 pt-36 md:pb-28 md:pt-40 lg:pb-36 lg:pt-44"
          initial="hidden"
          animate="visible"
          variants={reduceMotion ? {} : stagger}
        >
          <div className="ds-hero-glow" aria-hidden />
          <div className="relative z-[1] grid grid-cols-1 gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-12">
            <div>
              <motion.div variants={reduceMotion ? {} : fadeUp}>
                <SectionLabel text="Stillwell · ETF Research" />
              </motion.div>
              <motion.h1
                className="relative z-[1] mb-6 max-w-3xl text-[2.75rem] font-normal leading-[1.05] text-[var(--foreground)] sm:text-5xl md:text-6xl lg:text-[5.25rem]"
                variants={reduceMotion ? {} : fadeUp}
              >
                专注{" "}
                <span className="relative inline-block">
                  <span className="marketing-gradient-text">
                    ETF 与指数基金
                  </span>
                  <span className="gradient-underline" aria-hidden />
                </span>
                <br />
                的投研与工具
              </motion.h1>
              <motion.p
                className="mb-5 max-w-[52ch] text-lg font-medium leading-snug tracking-wide text-[var(--brand-text)] sm:text-xl"
                variants={reduceMotion ? {} : fadeUp}
              >
                涨跌有常，策略在心
              </motion.p>
              <motion.p
                className="mb-8 max-w-[52ch] text-base leading-[1.7] text-[var(--muted-foreground)]"
                variants={reduceMotion ? {} : fadeUp}
              >
                以指数为锚、以数据为界：用可验证的持仓结构与策略计算，帮你在噪声里把
                ETF
                投资看得更清楚。投研相关能力将持续迭代，当前可先使用下方基础工具。
              </motion.p>
              <motion.div
                className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center"
                variants={reduceMotion ? {} : fadeUp}
              >
                <Link
                  href="/grid"
                  className="group inline-flex min-h-12 min-w-[44px] items-center justify-center rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                >
                  <span className="marketing-primary-btn inline-flex min-h-12 items-center gap-2 px-7 py-3.5 text-sm font-semibold text-[var(--accent-foreground)]">
                    进入网格交易
                    <ArrowUpRight
                      className="marketing-primary-btn__icon h-4 w-4"
                      strokeWidth={1.5}
                    />
                  </span>
                </Link>
                <Link
                  href="/correlation"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--border)] bg-transparent px-7 py-3.5 text-sm font-semibold text-[var(--foreground)] shadow-[var(--ds-shadow-sm)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--accent)_30%,var(--border))] hover:bg-[var(--muted)] active:scale-[0.98]"
                >
                  指数对比
                </Link>
              </motion.div>
              <motion.p
                className="max-w-[52ch] font-en-arial text-[10px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]"
                variants={reduceMotion ? {} : fadeUp}
              >
                Still in volatility, rich in time.
              </motion.p>
            </div>
            <motion.div variants={reduceMotion ? {} : fadeUp}>
              <HeroGraphic />
            </motion.div>
          </div>
        </motion.section>

        {/* Tools：muted 画布 · Section 大间距 */}
        <motion.section
          className="border-y border-[var(--border)] bg-[var(--muted)] py-28 md:py-36 lg:py-44"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15, margin: "-60px" }}
          variants={reduceMotion ? {} : stagger}
        >
          <div className="mx-auto max-w-6xl px-6 lg:px-10">
            <motion.div variants={reduceMotion ? {} : fadeUp}>
              <SectionLabel text="Tools · 基础工具" />
            </motion.div>
            <motion.h2
              className="mb-6 max-w-2xl text-3xl font-normal leading-[1.15] text-[var(--foreground)] md:text-[3.25rem]"
              variants={reduceMotion ? {} : fadeUp}
            >
              已上线的
              <span className="marketing-gradient-text"> 本地能力</span>
            </motion.h2>
            <motion.p
              className="mb-12 max-w-[60ch] text-base leading-[1.7] text-[var(--muted-foreground)]"
              variants={reduceMotion ? {} : fadeUp}
            >
              已上线的本地计算与指数数据能力，可与后续投研模块搭配使用。
            </motion.p>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
              {TOOLS.map((tool, index) => (
                <motion.div
                  key={tool.num}
                  variants={reduceMotion ? {} : fadeUp}
                  custom={index}
                >
                  <ToolCard tool={tool} />
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* About + Snapshot · 点阵深色卡 */}
        <section
          id="about"
          className="mx-auto max-w-6xl scroll-mt-24 px-6 py-28 md:py-36 lg:py-44 lg:px-10"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15, margin: "-60px" }}
            variants={reduceMotion ? {} : stagger}
          >
            <div className="grid grid-cols-1 gap-14 lg:grid-cols-12 lg:gap-20">
              <motion.div
                className="lg:col-span-7"
                variants={reduceMotion ? {} : fadeUp}
              >
                <SectionLabel text="About" />
                <h2 className="mb-6 text-3xl font-normal leading-[1.15] text-[var(--foreground)] md:text-[3.25rem]">
                  关于 Stillwell
                </h2>
                <div className="max-w-[52ch] space-y-4 text-sm leading-[1.75] text-[var(--muted-foreground)]">
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
                    投研模块将随功能迭代陆续开放；当前你可使用网格参数计算与指数对比等基础能力。我们只呈现模型与事实，投资决策始终由你自己做出。
                  </p>
                  <p className="font-medium text-[var(--foreground)]">
                    涨跌有常，策略在心。
                  </p>
                </div>
              </motion.div>

              <motion.div
                className="lg:col-span-5"
                variants={reduceMotion ? {} : fadeUp}
              >
                <SectionLabel text="Key Facts" />
                <div className="rounded-2xl border border-white/10 bg-[#0f172a] p-6 text-slate-100 shadow-[var(--ds-shadow-xl)] [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:32px_32px] md:p-8">
                  <p className="font-en-arial mb-6 text-[10px] uppercase tracking-[0.18em] text-slate-400">
                    Snapshot
                  </p>
                  <motion.div
                    className="divide-y divide-white/10"
                    variants={reduceMotion ? {} : innerStagger}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.25 }}
                  >
                    {FACTS.map((f) => (
                      <motion.div
                        key={f.label}
                        className="flex items-baseline justify-between gap-6 py-3.5 first:pt-0"
                        variants={reduceMotion ? {} : fadeUp}
                      >
                        <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400">
                          {f.label}
                        </span>
                        <span className="text-right text-sm tabular-nums text-slate-50">
                          {f.value}
                        </span>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* Inverted CTA：foreground 底 · 点阵纹理 */}
        <motion.section
          className="relative overflow-hidden border-t border-[var(--border)] bg-[#0f172a] py-28 text-[#fafafa] md:py-36 lg:py-44 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:32px_32px]"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={reduceMotion ? {} : stagger}
        >
          <div
            className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] blur-[120px]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-[color-mix(in_srgb,var(--accent-secondary)_6%,transparent)] blur-[100px]"
            aria-hidden
          />
          <div className="relative mx-auto max-w-6xl px-6 lg:px-10">
            <motion.div variants={reduceMotion ? {} : fadeUp}>
              <SectionLabel text="Start Now" onDark />
            </motion.div>
            <motion.h2
              className="mb-10 max-w-xl text-3xl font-normal leading-[1.15] text-[#fafafa] md:text-[3.25rem]"
              variants={reduceMotion ? {} : fadeUp}
            >
              立即开始：无需注册，
              <br />
              核心数据与计算在本地完成。
            </motion.h2>
            <motion.div
              className="flex flex-wrap items-center gap-4"
              variants={reduceMotion ? {} : fadeUp}
            >
              <Link
                href="/grid"
                className="group inline-flex min-h-12 items-center rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-secondary)]"
              >
                <span className="marketing-primary-btn inline-flex min-h-12 items-center gap-2 px-7 py-3.5 text-sm font-semibold text-[var(--accent-foreground)]">
                  进入网格交易
                  <ArrowUpRight
                    className="marketing-primary-btn__icon h-4 w-4"
                    strokeWidth={1.5}
                  />
                </span>
              </Link>
              <Link
                href="/correlation"
                className="ds-btn-outline-on-dark inline-flex min-h-12 items-center rounded-xl px-7 py-3.5 text-sm font-semibold"
              >
                指数对比
              </Link>
            </motion.div>
          </div>
        </motion.section>
      </main>

      <motion.footer
        className="mx-auto max-w-6xl border-t border-[var(--border)] px-6 py-8 lg:px-10"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.35 }}
        variants={reduceMotion ? {} : fadeUp}
      >
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-xs text-[var(--muted-foreground)]">
            © {new Date().getFullYear()} Stillwell
          </p>
          <div className="flex flex-wrap items-center gap-6">
            {[
              ["行情中心", "/indices"],
              ["网格交易", "/grid"],
              ["指数对比", "/correlation"],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="text-xs text-[var(--muted-foreground)] transition-colors hover:text-[var(--accent)]"
              >
                {label}
              </Link>
            ))}
            <a
              href="#about"
              className="text-xs text-[var(--muted-foreground)] transition-colors hover:text-[var(--accent)]"
            >
              关于
            </a>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}
