import type { ReactNode } from "react";

interface KpiCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  sub?: string;
}

export function KpiCard({ icon, label, value, sub }: KpiCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-white px-5 py-4 shadow-soft">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-neutral">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <p className="font-mono text-3xl font-semibold text-textDark">{value}</p>
      {sub && <p className="text-xs text-neutral">{sub}</p>}
    </div>
  );
}
