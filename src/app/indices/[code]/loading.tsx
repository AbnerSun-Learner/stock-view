import { Skeleton } from "antd";

function SkeletonBlock({ className = "" }: SkeletonBlockProps) {
  return (
    <Skeleton
      active
      className={`${className} overflow-hidden [&_.ant-skeleton-title]:!m-0 [&_.ant-skeleton-title]:!h-full [&_.ant-skeleton-title]:!w-full [&_.ant-skeleton-title]:!rounded-[inherit]`}
      title={{ width: "100%" }}
      paragraph={false}
    />
  );
}

export default function IndexDetailLoading() {
  return (
    <div
      className="space-y-10 pb-16"
      role="status"
      aria-label="指数详情加载中"
      aria-live="polite"
    >
      <header className="relative overflow-hidden rounded-2xl border border-[color:var(--border-color)] bg-[linear-gradient(135deg,var(--correlation-card-surface),var(--correlation-card-tint))] p-5 shadow-[0_18px_48px_color-mix(in_srgb,var(--foreground)_6%,transparent)] md:p-7">
        <div
          className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--correlation-brand)_14%,transparent),transparent_68%)]"
          aria-hidden
        />
        <div className="relative space-y-5">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)] lg:items-start">
            <div className="min-w-0">
              <SkeletonBlock className="h-3 w-44 rounded-full" />
              <SkeletonBlock className="mt-4 h-12 w-56 md:h-14 md:w-72" />
              <div className="mt-4 flex flex-wrap gap-2">
                <SkeletonBlock className="h-8 w-28 rounded-full" />
                <SkeletonBlock className="h-8 w-16 rounded-full" />
                <SkeletonBlock className="h-8 w-36 rounded-full" />
              </div>
            </div>

            <div className="rounded-2xl border border-[color:var(--border-color)] bg-[color-mix(in_srgb,var(--correlation-card-surface)_82%,transparent)] p-4">
              <SkeletonBlock className="h-5 w-40" />
              <SkeletonBlock className="mt-2 h-3 w-52" />
              <div className="mt-5 grid grid-cols-2 gap-4">
                <GaugeSkeleton />
                <GaugeSkeleton />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] px-4 py-3">
            <SkeletonBlock className="h-4 w-72 max-w-full" />
          </div>
        </div>
      </header>

      <section className="space-y-4">
        <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] xl:gap-8">
          <div className="min-w-0 rounded-2xl border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] p-5 shadow-[0_14px_36px_color-mix(in_srgb,var(--foreground)_5%,transparent)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <SkeletonBlock className="h-6 w-36" />
                <SkeletonBlock className="mt-3 h-4 w-64 max-w-full" />
              </div>
              <div className="flex gap-2">
                <SkeletonBlock className="h-8 w-20 rounded-full" />
                <SkeletonBlock className="h-8 w-20 rounded-full" />
                <SkeletonBlock className="h-8 w-20 rounded-full" />
              </div>
            </div>
            <ChartSkeleton />
            <Skeleton active title={false} paragraph={{ rows: 1, width: "20rem" }} className="mt-4 max-w-full" />
          </div>

          <div className="rounded-2xl border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] p-5 shadow-[0_14px_36px_color-mix(in_srgb,var(--foreground)_5%,transparent)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <SkeletonBlock className="h-6 w-24" />
                <SkeletonBlock className="mt-3 h-4 w-44" />
              </div>
              <SkeletonBlock className="h-8 w-14 rounded-full" />
            </div>
            <div className="mt-6 space-y-3">
              <MetricSkeleton />
              <MetricSkeleton />
              <MetricSkeleton />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <AnalyticsSkeleton />
        <AnalyticsSkeleton />
        <AnalyticsSkeleton className="lg:col-span-2" />
      </section>

      <section className="rounded-2xl border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] p-5 shadow-[0_14px_36px_color-mix(in_srgb,var(--foreground)_5%,transparent)] md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <SkeletonBlock className="h-3 w-20 rounded-full" />
            <SkeletonBlock className="mt-3 h-7 w-28" />
            <SkeletonBlock className="mt-3 h-4 w-80 max-w-full" />
          </div>
          <div className="flex gap-2">
            <SkeletonBlock className="h-8 w-20 rounded-full" />
            <SkeletonBlock className="h-8 w-20 rounded-full" />
            <SkeletonBlock className="h-8 w-20 rounded-full" />
          </div>
        </div>
        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <ChartSkeleton />
          <div className="space-y-3">
            <SkeletonBlock className="h-5 w-24" />
            <SkeletonBlock className="h-4 w-full" />
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
          </div>
        </div>
      </section>

      <p className="sr-only">指数详情正在加载，请稍候。</p>
    </div>
  );
}

function GaugeSkeleton() {
  return (
    <div className="rounded-xl border border-[color:var(--border-color)] bg-[color-mix(in_srgb,var(--correlation-card-surface)_78%,transparent)] p-4">
      <SkeletonBlock className="mx-auto h-24 w-24 rounded-full" />
      <SkeletonBlock className="mx-auto mt-3 h-4 w-20" />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="mt-6 h-72 rounded-2xl border border-[color:var(--border-color)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--correlation-card-tint)_54%,transparent),color-mix(in_srgb,var(--correlation-card-surface)_86%,transparent))] p-4">
      <div className="flex h-full items-end gap-3">
        {CHART_BARS.map((height, index) => (
          <div
            key={`${height}-${index}`}
            className="flex-1 rounded-t-lg bg-[color-mix(in_srgb,var(--correlation-brand)_16%,var(--correlation-card-surface))]"
            style={{ height }}
          />
        ))}
      </div>
    </div>
  );
}

function MetricSkeleton() {
  return (
    <div className="rounded-xl border border-[color:var(--border-color)] bg-[color-mix(in_srgb,var(--correlation-card-tint)_38%,transparent)] p-4">
      <Skeleton active title={false} paragraph={{ rows: 3, width: ["5rem", "7rem", "8rem"] }} />
    </div>
  );
}

function AnalyticsSkeleton({ className = "" }: SkeletonBlockProps) {
  return (
    <div
      className={`rounded-2xl border border-[color:var(--border-color)] bg-[var(--correlation-card-surface)] p-5 shadow-[0_14px_36px_color-mix(in_srgb,var(--foreground)_5%,transparent)] ${className}`}
    >
      <Skeleton active title={{ width: "9rem" }} paragraph={{ rows: 1, width: "18rem" }} />
      <ChartSkeleton />
    </div>
  );
}

interface SkeletonBlockProps {
  className?: string;
}

const CHART_BARS = [
  "42%",
  "58%",
  "46%",
  "68%",
  "54%",
  "76%",
  "62%",
  "82%",
  "70%",
  "88%",
  "64%",
  "74%",
];
