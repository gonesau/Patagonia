import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DistributionItem } from "@/services/dashboardService";

const COLORS: Record<string, string> = {
  Fácil: "#92c7c7",
  Moderado: "#5ea59b",
  Difícil: "#c8a84b",
  Extremo: "#c0544a",
};

interface Props {
  data: DistributionItem[];
}

export function DificultadBarChart({ data }: Props) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-neutral">Sin datos en el período</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#d0e8e5" vertical={false} />
        <XAxis dataKey="nombre" tick={{ fontSize: 11, fill: "#6b7b7a" }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: "#6b7b7a" }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
          width={28}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #d0e8e5" }}
          formatter={(v) => [Number(v ?? 0), "Tours"]}
        />
        <Bar dataKey="valor" radius={[4, 4, 0, 0]} maxBarSize={48}>
          {data.map((entry) => (
            <Cell key={entry.nombre} fill={COLORS[entry.nombre] ?? "#5ea59b"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
