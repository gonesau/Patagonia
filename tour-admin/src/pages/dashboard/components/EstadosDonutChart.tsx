import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { DistributionItem } from "@/services/dashboardService";

const COLORS: Record<string, string> = {
  Programado: "#5ea59b",
  "En curso": "#92c7c7",
  Realizado: "#6b7b7a",
  Cancelado: "#c0544a",
};

interface Props {
  data: DistributionItem[];
}

export function EstadosDonutChart({ data }: Props) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-neutral">Sin tours en el período</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          dataKey="valor"
          nameKey="nombre"
          cx="50%"
          cy="50%"
          innerRadius={52}
          outerRadius={76}
          paddingAngle={3}
          strokeWidth={0}
        >
          {data.map((entry) => (
            <Cell key={entry.nombre} fill={COLORS[entry.nombre] ?? "#5ea59b"} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #d0e8e5" }}
          formatter={(v, name) => [v, name]}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: "#6b7b7a" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
