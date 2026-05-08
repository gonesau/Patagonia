import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/layout/PageHeader";
import { getDashboardMetrics, type DashboardMetrics } from "@/services/dashboardService";
import { toServiceErrorMessage } from "@/services/serviceErrors";
import { CalendarDays, HandCoins, Route, Users } from "lucide-react";

export function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    toursProximos30Dias: 0,
    vagosActivos: null,
    ingresosMes: 0,
    toursAnio: 0,
    hasRestrictedMetrics: false,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setErrorMessage(null);
        setMetrics(await getDashboardMetrics());
      } catch (error) {
        setErrorMessage(toServiceErrorMessage(error));
      }
    };
    void loadMetrics();
  }, []);

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
          <p className="font-mono text-2xl text-textDark">{metrics.toursAnio}</p>
        </Card>
      </div>
    </>
  );
}
