/**
 * 指数对比页面的骨架屏组件。
 *
 * 在 API 请求期间展示占位动画，避免布局抖动。
 */

function SkeletonBlock({
  height,
  width = "100%",
  className = "",
}: {
  height: string;
  width?: string;
  className?: string;
}) {
  return (
    <div
      className={`bg-[var(--border-color)] animate-pulse rounded-none ${className}`}
      style={{ height, width }}
    />
  );
}

export function SkeletonResultCard() {
  return (
    <div className="correlation-card p-6 md:p-8 space-y-6">
      <SkeletonBlock height="16px" width="40%" />
      <SkeletonBlock height="24px" width="60%" />
      <div className="space-y-2">
        <SkeletonBlock height="12px" width="30%" />
        <div className="flex items-baseline gap-3">
          <SkeletonBlock height="48px" width="80px" />
          <SkeletonBlock height="24px" width="60px" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <SkeletonBlock height="64px" />
        <SkeletonBlock height="64px" />
        <SkeletonBlock height="64px" />
        <SkeletonBlock height="64px" />
      </div>
      <SkeletonBlock height="12px" width="25%" />
      <SkeletonBlock height="20px" width="50%" />
      <div className="pt-4 border-t border-[color:var(--border-color)] space-y-2">
        <SkeletonBlock height="16px" />
        <SkeletonBlock height="16px" width="80%" />
      </div>
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="correlation-card p-6 md:p-8 flex flex-col space-y-4">
      <SkeletonBlock height="16px" width="40%" />
      <SkeletonBlock height="24px" width="50%" />
      <SkeletonBlock height="12px" width="70%" />
      <SkeletonBlock height="320px" className="mt-4" />
      <SkeletonBlock height="12px" width="40%" />
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="correlation-card p-6 md:p-8 space-y-6">
      <div className="flex items-baseline justify-between">
        <div className="space-y-2">
          <SkeletonBlock height="16px" width="100px" />
          <SkeletonBlock height="24px" width="120px" />
        </div>
        <SkeletonBlock height="12px" width="80px" />
      </div>
      <div className="space-y-3">
        <SkeletonBlock height="40px" />
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBlock key={i} height="48px" />
        ))}
      </div>
    </div>
  );
}
