"use client";

interface PageHeaderProps {
  title: string;
  description: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="text-center mb-8">
      <h1 className="text-4xl md:text-5xl font-serif font-medium leading-tight mb-3 tracking-tight">
        {title}
      </h1>
      <p className="text-lg text-[var(--muted-foreground)] leading-relaxed font-light max-w-2xl mx-auto">
        {description}
      </p>
    </div>
  );
}
