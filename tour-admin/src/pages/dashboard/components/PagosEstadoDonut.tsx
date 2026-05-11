import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { DistributionItem } from "@/services/dashboardService";

const COLORS: Record<string, string> = {
  Completo: "#5ea59b",
  Parcial: "#c8a84b",
  Pendiente: "#c0544a",
};

interface Props {
  data: DistributionItem[];
}

export function PagosEstadoDonut({ data }: Props) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-neutral">Sin inscripciones en el período</p>;
  }
  const total = data.reduce((s, d) => s + d.valor, 0);
  return (
    <div className="relative">
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
              <Cell key={entry.nombre} fill={COLORS[entry.nombre] ?? "#92c7c7"} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #d0e8e5" }}
            formatter={(v) => { const n = Number(v ?? 0); return [`${n} (${Math.round((n / total) * 100)}%)`, ""]; }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: "#6b7b7a" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
