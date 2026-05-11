import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { OcupacionItem } from "@/services/dashboardService";

interface Props {
  data: OcupacionItem[];
}

function getColor(pct: number): string {
  if (pct >= 90) return "#c0544a";
  if (pct >= 70) return "#c8a84b";
  return "#5ea59b";
}

export function OcupacionBarChart({ data }: Props) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-neutral">No hay tours próximos</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#d0e8e5" horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: "#6b7b7a" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${v}%`}
        />
        <YAxis
          type="category"
          dataKey="nombre"
          tick={{ fontSize: 11, fill: "#6b7b7a" }}
          axisLine={false}
          tickLine={false}
          width={110}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #d0e8e5" }}
          formatter={(v) => [`${Number(v ?? 0)}%`, "Ocupación"]}
        />
        <Bar dataKey="porcentaje" radius={[0, 4, 4, 0]} maxBarSize={20}>
          {data.map((entry) => (
            <Cell key={entry.nombre} fill={getColor(entry.porcentaje)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
