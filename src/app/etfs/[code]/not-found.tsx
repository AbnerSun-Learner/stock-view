import Link from "next/link";

export default function EtfDetailNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <p className="mb-3 text-xs tracking-[0.2em] text-[var(--muted-foreground)] uppercase">
        Not found
      </p>
      <h1 className="mb-3 text-2xl font-light text-[var(--foreground)] md:text-3xl">
        未找到该 ETF
      </h1>
      <p className="mb-8 max-w-md text-sm leading-relaxed text-[var(--muted-foreground)]">
        代码可能输入有误，或暂未收录在行情中心 ETF 池。
      </p>
      <Link
        href="/indices"
        className="inline-flex items-center rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--correlation-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--page-bg)]"
      >
        返回行情中心
      </Link>
    </div>
  );
}
