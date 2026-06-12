import type { ReactNode } from "react";

interface KpiCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  sub?: string;
}

export function KpiCard({ icon, label, value, sub }: KpiCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-white px-4 py-3 shadow-soft sm:px-5 sm:py-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-neutral">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <p className="truncate font-mono text-2xl font-semibold text-textDark sm:text-3xl">{value}</p>
      {sub && <p className="text-xs text-neutral">{sub}</p>}
    </div>
  );
}
