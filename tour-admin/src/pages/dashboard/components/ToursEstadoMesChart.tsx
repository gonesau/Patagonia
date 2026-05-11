import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MonthlyTourStatusSeries } from "@/services/dashboardService";

interface Props {
  data: MonthlyTourStatusSeries[];
}

export function ToursEstadoMesChart({ data }: Props) {
  if (data.length === 0 || data.every((d) => d.realizados === 0 && d.cancelados === 0)) {
    return <p className="py-8 text-center text-sm text-neutral">Sin datos en el período</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#d0e8e5" vertical={false} />
        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#6b7b7a" }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: "#6b7b7a" }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
          width={28}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #d0e8e5" }}
          formatter={(v, name) => [Number(v ?? 0), name === "realizados" ? "Realizados" : "Cancelados"]}
        />
        <Legend
          iconType="square"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, color: "#6b7b7a" }}
          formatter={(v: string) => (v === "realizados" ? "Realizados" : "Cancelados")}
        />
        <Bar dataKey="realizados" stackId="a" fill="#5ea59b" radius={[0, 0, 0, 0]} maxBarSize={36} />
        <Bar dataKey="cancelados" stackId="a" fill="#c0544a" radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}
