import type { PeriodFilter } from "@/services/dashboardService";

interface FilterBarProps {
  value: PeriodFilter;
  onChange: (v: PeriodFilter) => void;
}

const OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: "30d", label: "Últimos 30 días" },
  { value: "3m", label: "3 meses" },
  { value: "6m", label: "6 meses" },
  { value: "year", label: "Este año" },
];

export function FilterBar({ value, onChange }: FilterBarProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-white p-1 w-fit">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
            value === opt.value
              ? "bg-primary text-white shadow-sm"
              : "text-neutral hover:bg-surface hover:text-textDark"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
