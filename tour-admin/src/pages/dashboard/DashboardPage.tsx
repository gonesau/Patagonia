import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/layout/PageHeader";
import { getDashboardMetrics, type DashboardMetrics, type PeriodFilter } from "@/services/dashboardService";
import { toServiceErrorMessage } from "@/services/serviceErrors";
import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle, CalendarDays, HandCoins, Route, TrendingUp, Users } from "lucide-react";

// Layout helpers
import { FilterBar } from "./components/FilterBar";
import { KpiCard } from "./components/KpiCard";
import { ChartCard } from "./components/ChartCard";

// Charts
import { IngresosAreaChart } from "./components/IngresosAreaChart";
import { EstadosDonutChart } from "./components/EstadosDonutChart";
import { OcupacionBarChart } from "./components/OcupacionBarChart";
import { PagosEstadoDonut } from "./components/PagosEstadoDonut";
import { DificultadBarChart } from "./components/DificultadBarChart";
import { IngresosGastosChart } from "./components/IngresosGastosChart";
import { NuevosVagosChart } from "./components/NuevosVagosChart";
import { ToursPorGuiaChart } from "./components/ToursPorGuiaChart";
import { MetodoPagoDonut } from "./components/MetodoPagoDonut";
import { ToursEstadoMesChart } from "./components/ToursEstadoMesChart";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonBlock({ h = "h-48" }: { h?: string }) {
  return <div className={`animate-pulse rounded-xl bg-border/50 ${h}`} />;
}

// ─── Component ────────────────────────────────────────────────────────────────

const EMPTY_METRICS: DashboardMetrics = {
  toursProximos30Dias: 0,
  vagosActivos: null,
  ingresosMes: 0,
  toursAnioRealizados: 0,
  hasRestrictedMetrics: false,
  upcomingTours: [],
  alerts: [],
  charts: {
    ingresosMensuales: [],
    toursPorEstado: [],
    ocupacionTours: [],
    estadosPago: [],
    toursPorDificultad: [],
    ingresosVsGastos: [],
    nuevosVagosMensuales: null,
    toursPorGuia: null,
    metodosPago: [],
    toursEstadoPorMes: [],
  },
};

export function DashboardPage() {
  const { profile } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics>(EMPTY_METRICS);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodFilter>("year");

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setErrorMessage(null);
        const data = await getDashboardMetrics({ rol: profile.rol, guiaId: profile.guiaId }, period);
        if (!cancelled) setMetrics(data);
      } catch (error) {
        if (!cancelled) setErrorMessage(toServiceErrorMessage(error));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [profile, period]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Panorama general de la operación — tours, ingresos, guías y vagos."
      />

      {/* ── Alertas ──────────────────────────────────────────────────────── */}
      {errorMessage ? <p className="mb-4 text-sm text-danger">{errorMessage}</p> : null}
      {metrics.hasRestrictedMetrics ? (
        <p className="mb-4 text-sm text-neutral">
          Algunas métricas requieren permisos de administrador y no están disponibles para esta sesión.
        </p>
      ) : null}

      {metrics.alerts.length > 0 ? (
        <div className="mb-5 space-y-2">
          {metrics.alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex gap-3 rounded-lg border p-3 text-sm ${
                alert.nivel === "critico"
                  ? "border-danger/40 bg-danger/10 text-textDark"
                  : "border-amber-500/40 bg-amber-500/10 text-textDark"
              }`}
            >
              <AlertTriangle
                size={18}
                strokeWidth={1.8}
                className={alert.nivel === "critico" ? "shrink-0 text-danger" : "shrink-0 text-amber-700"}
              />
              <div>
                <p className="font-medium">{alert.titulo}</p>
                <p className="text-neutral">{alert.detalle}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* ── Filtro de período ─────────────────────────────────────────────── */}
      <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-neutral">Todos los gráficos reflejan el período seleccionado</p>
        <FilterBar value={period} onChange={setPeriod} />
      </div>

      {/* ── KPIs ─────────────────────────────────────────────────────────── */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<CalendarDays size={16} strokeWidth={1.8} />}
          label="Tours próximos (30 días)"
          value={loading ? "…" : metrics.toursProximos30Dias}
        />
        <KpiCard
          icon={<HandCoins size={16} strokeWidth={1.8} />}
          label="Ingresos del mes"
          value={loading ? "…" : `$${metrics.ingresosMes.toFixed(2)}`}
        />
        <KpiCard
          icon={<Users size={16} strokeWidth={1.8} />}
          label="Vagos activos"
          value={loading ? "…" : metrics.vagosActivos === null ? "Sin acceso" : metrics.vagosActivos}
        />
        <KpiCard
          icon={<Route size={16} strokeWidth={1.8} />}
          label="Tours realizados este año"
          value={loading ? "…" : metrics.toursAnioRealizados}
        />
      </div>

      {/* ── Ingresos mensuales — ancho completo ──────────────────────────── */}
      {loading ? (
        <SkeletonBlock h="h-64 mb-6" />
      ) : (
        <ChartCard title="Ingresos mensuales" className="mb-6">
          <IngresosAreaChart data={metrics.charts.ingresosMensuales} />
        </ChartCard>
      )}

      {/* ── Fila 2: Estado de tours + Ocupación ──────────────────────────── */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        {loading ? (
          <>
            <SkeletonBlock />
            <SkeletonBlock />
          </>
        ) : (
          <>
            <ChartCard title="Distribución por estado">
              <EstadosDonutChart data={metrics.charts.toursPorEstado} />
            </ChartCard>
            <ChartCard title="Tasa de ocupación — tours próximos">
              <OcupacionBarChart data={metrics.charts.ocupacionTours} />
            </ChartCard>
          </>
        )}
      </div>

      {/* ── Fila 3: Estado de pagos + Ingresos vs Gastos ─────────────────── */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        {loading ? (
          <>
            <SkeletonBlock />
            <SkeletonBlock />
          </>
        ) : (
          <>
            <ChartCard title="Estado de pagos">
              <PagosEstadoDonut data={metrics.charts.estadosPago} />
            </ChartCard>
            <ChartCard title="Ingresos vs. Gastos operativos">
              <IngresosGastosChart data={metrics.charts.ingresosVsGastos} />
            </ChartCard>
          </>
        )}
      </div>

      {/* ── Fila 4: Dificultad + Método de pago ──────────────────────────── */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        {loading ? (
          <>
            <SkeletonBlock />
            <SkeletonBlock />
          </>
        ) : (
          <>
            <ChartCard title="Tours por dificultad">
              <DificultadBarChart data={metrics.charts.toursPorDificultad} />
            </ChartCard>
            <ChartCard title="Método de pago más usado">
              <MetodoPagoDonut data={metrics.charts.metodosPago} />
            </ChartCard>
          </>
        )}
      </div>

      {/* ── Fila 5: Nuevos vagos + Tours por guía ───────────────────────── */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        {loading ? (
          <>
            <SkeletonBlock />
            <SkeletonBlock />
          </>
        ) : (
          <>
            <ChartCard title="Nuevos vagos por mes">
              <NuevosVagosChart data={metrics.charts.nuevosVagosMensuales} />
            </ChartCard>
            <ChartCard title="Carga de tours por guía">
              <ToursPorGuiaChart data={metrics.charts.toursPorGuia} />
            </ChartCard>
          </>
        )}
      </div>

      {/* ── Tours realizados vs cancelados — ancho completo ───────────────── */}
      {loading ? (
        <SkeletonBlock h="h-64 mb-6" />
      ) : (
        <ChartCard title="Tours realizados vs. cancelados por mes" className="mb-6">
          <ToursEstadoMesChart data={metrics.charts.toursEstadoPorMes} />
        </ChartCard>
      )}

      {/* ── Tabla próximos tours ─────────────────────────────────────────── */}
      {!loading && metrics.upcomingTours.length > 0 ? (
        <Card>
          <div className="mb-1 flex items-center gap-2 text-neutral">
            <TrendingUp size={15} strokeWidth={1.8} />
            <h2 className="font-heading text-sm font-semibold uppercase tracking-wide">Próximos tours (30 días)</h2>
          </div>
          <p className="mb-4 text-xs text-neutral">Cupos y estado de cada tour que inicia en los próximos 30 días.</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border text-neutral">
                  <th className="py-2 pr-3 font-medium">Tour</th>
                  <th className="py-2 pr-3 font-medium">Fecha inicio</th>
                  <th className="py-2 pr-3 font-medium">Estado</th>
                  <th className="py-2 pr-3 font-medium">Cupos</th>
                  <th className="py-2 pr-3 font-medium">Ocupación</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {metrics.upcomingTours.map((row) => {
                  const pct = row.cupoMaximo > 0 ? Math.round((row.inscritosActivos / row.cupoMaximo) * 100) : 0;
                  const pctColor = pct >= 90 ? "text-danger" : pct >= 70 ? "text-warning" : "text-primary";
                  return (
                    <tr key={row.id} className="border-b border-border/80">
                      <td className="py-2 pr-3 text-textDark">{row.nombre}</td>
                      <td className="py-2 pr-3 font-mono text-xs text-textDark">
                        {row.fechaInicio.toLocaleString("es-SV")}
                      </td>
                      <td className="py-2 pr-3 text-textDark">{row.estado}</td>
                      <td className="py-2 pr-3 text-textDark">
                        {row.inscritosActivos} / {row.cupoMaximo}
                      </td>
                      <td className={`py-2 pr-3 font-mono text-xs font-semibold ${pctColor}`}>{pct}%</td>
                      <td className="py-2">
                        <Link className="text-primary underline hover:no-underline" to={`/tours?tour=${row.id}`}>
                          Ver
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </>
  );
}
