import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/layout/PageHeader";
import { getDashboardMetrics, type DashboardMetrics } from "@/services/dashboardService";
import { toServiceErrorMessage } from "@/services/serviceErrors";
import { useAuth } from "@/hooks/useAuth";
import { CalendarDays, HandCoins, Route, Users, AlertTriangle } from "lucide-react";

export function DashboardPage() {
  const { profile } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    toursProximos30Dias: 0,
    vagosActivos: null,
    ingresosMes: 0,
    toursAnioRealizados: 0,
    hasRestrictedMetrics: false,
    upcomingTours: [],
    alerts: [],
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) {
      return;
    }
    const loadMetrics = async () => {
      try {
        setErrorMessage(null);
        setMetrics(
          await getDashboardMetrics({
            rol: profile.rol,
            guiaId: profile.guiaId,
          }),
        );
      } catch (error) {
        setErrorMessage(toServiceErrorMessage(error));
      }
    };
    void loadMetrics();
  }, [profile]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Métricas operativas, alertas y tours próximos de los próximos 30 días."
      />
      {errorMessage ? <p className="mb-3 text-sm text-danger">{errorMessage}</p> : null}
      {metrics.hasRestrictedMetrics ? (
        <p className="mb-3 text-sm text-neutral">
          Algunas métricas requieren permisos de administrador y no están disponibles para esta sesión.
        </p>
      ) : null}

      {metrics.alerts.length > 0 ? (
        <div className="mb-4 space-y-2">
          {metrics.alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex gap-3 rounded-md border p-3 text-sm ${
                alert.nivel === "critico"
                  ? "border-danger/40 bg-danger/10 text-textDark"
                  : "border-amber-500/40 bg-amber-500/10 text-textDark"
              }`}
            >
              <AlertTriangle
                size={18}
                strokeWidth={1.8}
                className={alert.nivel === "critico" ? "text-danger" : "text-amber-700"}
              />
              <div>
                <p className="font-medium">{alert.titulo}</p>
                <p className="text-neutral">{alert.detalle}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <div className="mb-1 flex items-center gap-2 text-sm text-neutral">
            <CalendarDays size={16} strokeWidth={1.8} />
            <p>Tours próximos</p>
          </div>
          <p className="font-mono text-2xl text-textDark">{metrics.toursProximos30Dias}</p>
        </Card>
        <Card>
          <div className="mb-1 flex items-center gap-2 text-sm text-neutral">
            <HandCoins size={16} strokeWidth={1.8} />
            <p>Ingresos del mes</p>
          </div>
          <p className="font-mono text-2xl text-textDark">${metrics.ingresosMes.toFixed(2)}</p>
        </Card>
        <Card>
          <div className="mb-1 flex items-center gap-2 text-sm text-neutral">
            <Users size={16} strokeWidth={1.8} />
            <p>Vagos activos</p>
          </div>
          <p className="font-mono text-2xl text-textDark">
            {metrics.vagosActivos === null ? "Sin acceso" : metrics.vagosActivos}
          </p>
        </Card>
        <Card>
          <div className="mb-1 flex items-center gap-2 text-sm text-neutral">
            <Route size={16} strokeWidth={1.8} />
            <p>Tours realizados en el año</p>
          </div>
          <p className="font-mono text-2xl text-textDark">{metrics.toursAnioRealizados}</p>
        </Card>
      </div>

      {metrics.upcomingTours.length > 0 ? (
        <div className="mt-4">
          <Card>
          <h2 className="mb-3 font-heading text-lg text-textDark">Próximos tours (30 días)</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border text-neutral">
                  <th className="py-2 pr-3 font-medium">Tour</th>
                  <th className="py-2 pr-3 font-medium">Fecha inicio</th>
                  <th className="py-2 pr-3 font-medium">Estado</th>
                  <th className="py-2 pr-3 font-medium">Cupos</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {metrics.upcomingTours.map((row) => (
                  <tr key={row.id} className="border-b border-border/80">
                    <td className="py-2 pr-3 text-textDark">{row.nombre}</td>
                    <td className="py-2 pr-3 font-mono text-xs text-textDark">
                      {row.fechaInicio.toLocaleString("es-SV")}
                    </td>
                    <td className="py-2 pr-3 text-textDark">{row.estado}</td>
                    <td className="py-2 pr-3 text-textDark">
                      {row.inscritosActivos} / {row.cupoMaximo}
                    </td>
                    <td className="py-2">
                      <Link className="text-primary underline hover:no-underline" to={`/tours?tour=${row.id}`}>
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </Card>
        </div>
      ) : null}
    </>
  );
}
