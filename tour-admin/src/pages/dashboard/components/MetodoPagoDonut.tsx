import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { DistributionItem } from "@/services/dashboardService";

const PALETTE = ["#5ea59b", "#92c7c7", "#c8a84b", "#4a8a80", "#8bb8b2", "#a07840", "#6b7b7a"];

interface Props {
  data: DistributionItem[];
}

export function MetodoPagoDonut({ data }: Props) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-neutral">Sin pagos en el período</p>;
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
          {data.map((entry, i) => (
            <Cell key={entry.nombre} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #d0e8e5" }}
          formatter={(v, name) => [Number(v ?? 0), name]}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: "#6b7b7a" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
