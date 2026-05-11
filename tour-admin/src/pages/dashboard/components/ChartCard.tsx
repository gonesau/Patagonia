import type { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function ChartCard({ title, children, className = "" }: ChartCardProps) {
  return (
    <div className={`rounded-xl border border-border bg-white p-5 shadow-soft ${className}`}>
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral">{title}</h3>
      {children}
    </div>
  );
}
