import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useIsMobile } from "@/hooks/useBreakpoint";
import type { GuiaCargaItem } from "@/services/dashboardService";

interface Props {
  data: GuiaCargaItem[] | null;
}

export function ToursPorGuiaChart({ data }: Props) {
  const isMobile = useIsMobile();
  if (data === null) {
    return (
      <p className="py-8 text-center text-sm text-neutral">
        Esta métrica requiere permisos de administrador.
      </p>
    );
  }
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-neutral">Sin tours asignados en el período</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#d0e8e5" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: "#6b7b7a" }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="nombre"
          tick={{ fontSize: 11, fill: "#6b7b7a" }}
          axisLine={false}
          tickLine={false}
          width={isMobile ? 72 : 110}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #d0e8e5" }}
          formatter={(v) => [Number(v ?? 0), "Tours"]}
        />
        <Bar dataKey="tours" radius={[0, 4, 4, 0]} maxBarSize={20}>
          {data.map((_, i) => (
            <Cell key={i} fill={i % 2 === 0 ? "#5ea59b" : "#92c7c7"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
