import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useIsMobile } from "@/hooks/useBreakpoint";
import type { MonthlySeries } from "@/services/dashboardService";

interface Props {
  data: MonthlySeries[];
}

export function IngresosAreaChart({ data }: Props) {
  const isMobile = useIsMobile();
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-neutral">Sin datos en el período</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#5ea59b" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#5ea59b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#d0e8e5" vertical={false} />
        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#6b7b7a" }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: "#6b7b7a" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => { const n = Number(v ?? 0); return `$${n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n}`; }}
          width={isMobile ? 40 : 52}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #d0e8e5", color: "#1a2e2c" }}
          formatter={(v) => [`$${Number(v ?? 0).toFixed(2)}`, "Ingresos"]}
        />
        <Area type="monotone" dataKey="valor" stroke="#5ea59b" strokeWidth={2} fill="url(#gradIngresos)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
