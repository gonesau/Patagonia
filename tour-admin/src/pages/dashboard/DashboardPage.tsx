import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/layout/PageHeader";
import { getDashboardMetrics, type DashboardMetrics } from "@/services/dashboardService";
import { toServiceErrorMessage } from "@/services/serviceErrors";

export function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    toursProximos30Dias: 0,
    vagosActivos: 0,
    ingresosMes: 0,
    toursAnio: 0,
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
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-neutral">Tours próximos</p>
          <p className="font-mono text-2xl text-textDark">{metrics.toursProximos30Dias}</p>
        </Card>
        <Card>
          <p className="text-sm text-neutral">Ingresos del mes</p>
          <p className="font-mono text-2xl text-textDark">${metrics.ingresosMes.toFixed(2)}</p>
        </Card>
        <Card>
          <p className="text-sm text-neutral">Vagos activos</p>
          <p className="font-mono text-2xl text-textDark">{metrics.vagosActivos}</p>
        </Card>
        <Card>
          <p className="text-sm text-neutral">Tours realizados en el año</p>
          <p className="font-mono text-2xl text-textDark">{metrics.toursAnio}</p>
        </Card>
      </div>
    </>
  );
}
