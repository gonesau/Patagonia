import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import { toursService } from "@/services/toursService";
import { pagosService } from "@/services/pagosService";
import { comprasService } from "@/services/comprasService";
import { calculateTourMargin } from "@/utils/financiero.utils";
import { generateVagosListPdf } from "@/utils/pdf.utils";
import { FileDown, FileSpreadsheet } from "lucide-react";

export function ReportesPage() {
  const [rows, setRows] = useState<Array<[string, string, string, string]>>([]);
  const [comprasGeneralesTotal, setComprasGeneralesTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const buildReport = async () => {
    setIsLoading(true);
    try {
      const [tours, comprasGenerales] = await Promise.all([toursService.list(), comprasService.listGeneral()]);
      const reportRows = await Promise.all(
        tours.map(async (tour) => {
          const [pagos, compras] = await Promise.all([
            pagosService.listByTour(tour.id),
            comprasService.listByTour(tour.id),
          ]);
          const ingresos = pagos.reduce((total, item) => total + item.monto, 0);
          const costoCompras = compras.reduce((total, item) => total + item.monto, 0);
          const margin = calculateTourMargin(
            ingresos,
            tour.costoTransporte ?? 0,
            costoCompras,
            tour.costosExtras ?? 0,
          );
          return [
            tour.nombre,
            `$${ingresos.toFixed(2)}`,
            `$${margin.costoTotal.toFixed(2)}`,
            `$${margin.margenGanancia.toFixed(2)}`,
          ] as [string, string, string, string];
        }),
      );
      setRows(reportRows);
      setComprasGeneralesTotal(comprasGenerales.reduce((total, item) => total + item.monto, 0));
    } finally {
      setIsLoading(false);
    }
  };

  const exportReport = () => {
    const pdf = generateVagosListPdf(
      "Reporte financiero mensual",
      rows.map((row) => [row[0], row[1], row[2], row[3], ""]),
    );
    pdf.save("reporte_financiero_mensual.pdf");
  };

  return (
    <>
      <PageHeader title="Reportes Financieros" description="Consolidado de ingresos, costos y margen por ocurrencia." />
      <Card>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row">
          <Button className="inline-flex items-center justify-center gap-2" onClick={() => void buildReport()} disabled={isLoading}>
            <FileSpreadsheet size={16} strokeWidth={1.8} />
            {isLoading ? "Generando..." : "Generar reporte"}
          </Button>
          <Button
            className="inline-flex items-center justify-center gap-2"
            variant="secondary"
            onClick={exportReport}
            disabled={!rows.length}
          >
            <FileDown size={16} strokeWidth={1.8} />
            Exportar PDF
          </Button>
        </div>
        <div className="mb-3 rounded-md bg-primary/10 p-3 text-sm text-textDark">
          Compras generales (no asociadas a tour): ${comprasGeneralesTotal.toFixed(2)}
        </div>
        <Table headers={["Tour", "Ingresos", "Costos", "Margen"]} rows={rows} />
      </Card>
    </>
  );
}
