import Link from "next/link";

export default function IndexDetailNotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)] mb-3">
        Not found
      </p>
      <h1 className="text-2xl md:text-3xl font-light text-[var(--foreground)] mb-3">
        未找到该指数
      </h1>
      <p className="text-sm text-[var(--muted-foreground)] max-w-md mb-8 leading-relaxed">
        代码可能输入有误、暂未收录，或 TuShare 当前暂无可用数据。
      </p>
      <Link
        href="/indices"
        className="inline-flex items-center rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--correlation-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--page-bg)]"
      >
        返回指数列表
      </Link>
    </div>
  );
}
