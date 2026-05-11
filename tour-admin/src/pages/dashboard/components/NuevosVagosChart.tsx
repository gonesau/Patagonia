import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MonthlySeries } from "@/services/dashboardService";

interface Props {
  data: MonthlySeries[] | null;
}

export function NuevosVagosChart({ data }: Props) {
  if (data === null) {
    return (
      <p className="py-8 text-center text-sm text-neutral">
        Esta métrica requiere permisos de administrador.
      </p>
    );
  }
  if (data.every((d) => d.valor === 0)) {
    return <p className="py-8 text-center text-sm text-neutral">Sin nuevos vagos en el período</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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
          formatter={(v) => [Number(v ?? 0), "Nuevos vagos"]}
        />
        <Line
          type="monotone"
          dataKey="valor"
          stroke="#92c7c7"
          strokeWidth={2.5}
          dot={{ r: 4, fill: "#92c7c7", strokeWidth: 0 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
