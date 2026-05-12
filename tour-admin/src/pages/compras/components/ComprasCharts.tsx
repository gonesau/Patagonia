import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "@/pages/dashboard/components/ChartCard";
import type { Compra } from "@/types/compra.types";

function monthKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function formatMesLabel(key: string): string {
  const [y, m] = key.split("-");
  if (!y || !m) {
    return key;
  }
  return `${m}/${y.slice(2)}`;
}

interface Props {
  compras: Compra[];
}

export function ComprasCharts({ compras }: Props) {
  const porCategoria = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of compras) {
      const label = item.categoriaNombreSnapshot?.trim() || item.categoriaId || "Sin categoría";
      map.set(label, (map.get(label) ?? 0) + item.monto);
    }
    return [...map.entries()]
      .map(([categoria, monto]) => ({ categoria, monto }))
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 12);
  }, [compras]);

  const porMes = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of compras) {
      const key = monthKey(item.fecha instanceof Date ? item.fecha : new Date(item.fecha));
      map.set(key, (map.get(key) ?? 0) + item.monto);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mesKey, monto]) => ({ mes: formatMesLabel(mesKey), monto }));
  }, [compras]);

  return (
    <div className="mb-4 grid gap-4 lg:grid-cols-2">
      <ChartCard title="Gastos por categoría (total histórico)">
        {porCategoria.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral">Sin datos de compras</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={porCategoria}
              layout="vertical"
              margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#d0e8e5" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7b7a" }} tickFormatter={(v) => `$${v}`} />
              <YAxis
                type="category"
                dataKey="categoria"
                width={120}
                tick={{ fontSize: 10, fill: "#6b7b7a" }}
                interval={0}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #d0e8e5" }}
                formatter={(v) => [`$${Number(v ?? 0).toFixed(2)}`, "Monto"]}
              />
              <Bar dataKey="monto" fill="#5ea59b" radius={[0, 4, 4, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
      <ChartCard title="Gastos por mes">
        {porMes.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral">Sin datos de compras</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={porMes} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d0e8e5" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#6b7b7a" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: "#6b7b7a" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) =>
                  `$${Number(v ?? 0) >= 1000 ? `${(Number(v ?? 0) / 1000).toFixed(1)}k` : Number(v ?? 0)}`
                }
                width={48}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #d0e8e5" }}
                formatter={(v) => [`$${Number(v ?? 0).toFixed(2)}`, "Monto"]}
              />
              <Bar dataKey="monto" fill="#7eb8b0" radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}
