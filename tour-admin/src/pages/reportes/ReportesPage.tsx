import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toursService } from "@/services/toursService";
import { pagosService } from "@/services/pagosService";
import { comprasService } from "@/services/comprasService";
import { calculateTourMargin } from "@/utils/financiero.utils";
import { generateVagosListPdf } from "@/utils/pdf.utils";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { registerAuditLog } from "@/services/auditoriaService";
import { toServiceErrorMessage } from "@/services/serviceErrors";

function startOfCurrentMonth(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
}

function endOfCurrentMonth(): string {
  const d = new Date();
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${last.getFullYear()}-${pad(last.getMonth() + 1)}-${pad(last.getDate())}`;
}

export function ReportesPage() {
  const { profile } = useAuth();
  const [fechaDesde, setFechaDesde] = useState<string>(() => startOfCurrentMonth());
  const [fechaHasta, setFechaHasta] = useState<string>(() => endOfCurrentMonth());
  const [soloRealizados, setSoloRealizados] = useState<boolean>(true);
  const [rows, setRows] = useState<Array<[string, string, string, string, string]>>([]);
  const [comprasGeneralesTotal, setComprasGeneralesTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const totales = useMemo(() => {
    let ing = 0;
    let costo = 0;
    let margen = 0;
    for (const row of rows) {
      ing += Number.parseFloat(row[1].replace(/[^0-9.-]/g, "")) || 0;
      costo += Number.parseFloat(row[2].replace(/[^0-9.-]/g, "")) || 0;
      margen += Number.parseFloat(row[3].replace(/[^0-9.-]/g, "")) || 0;
    }
    return { ingresos: ing, costos: costo, margen };
  }, [rows]);

  const buildReport = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const desde = new Date(`${fechaDesde}T00:00:00`);
      const hasta = new Date(`${fechaHasta}T23:59:59`);
      if (Number.isNaN(desde.getTime()) || Number.isNaN(hasta.getTime()) || desde > hasta) {
        setErrorMessage("Revise el rango de fechas.");
        return;
      }
      const [tours, comprasGenerales] = await Promise.all([toursService.list(), comprasService.listGeneral()]);
      const filtered = tours.filter((tour) => {
        const d = new Date(tour.fechaInicio);
        if (d < desde || d > hasta) {
          return false;
        }
        if (soloRealizados && tour.estado !== "realizado") {
          return false;
        }
        return true;
      });
      const reportRows = await Promise.all(
        filtered.map(async (tour) => {
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
          const fecha = new Date(tour.fechaInicio).toLocaleDateString("es-SV");
          return [
            tour.nombre,
            `$${ingresos.toFixed(2)}`,
            `$${margin.costoTotal.toFixed(2)}`,
            `$${margin.margenGanancia.toFixed(2)}`,
            fecha,
          ] as [string, string, string, string, string];
        }),
      );
      setRows(reportRows);
      setComprasGeneralesTotal(comprasGenerales.reduce((total, item) => total + item.monto, 0));
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const exportReport = () => {
    if (!profile) {
      return;
    }
    const columnas = ["Tour", "Ingresos", "Costos", "Margen", "Fecha salida"];
    const footerRows: string[][] = [
      ["Totales", `$${totales.ingresos.toFixed(2)}`, `$${totales.costos.toFixed(2)}`, `$${totales.margen.toFixed(2)}`, ""],
      ["Compras generales (no tour)", `$${comprasGeneralesTotal.toFixed(2)}`, "", "", ""],
    ];
    const pdf = generateVagosListPdf(
      "Reporte financiero",
      [...rows.map((r) => [...r]), ...footerRows],
      columnas,
    );
    const safeDesde = fechaDesde.replaceAll("-", "");
    const safeHasta = fechaHasta.replaceAll("-", "");
    pdf.save(`reporte_financiero_${safeDesde}_${safeHasta}.pdf`);
    void registerAuditLog({
      usuarioId: profile.id,
      usuarioEmail: profile.email,
      accion: "export",
      entidad: "reporte_financiero",
      entidadId: `${fechaDesde}_${fechaHasta}`,
    });
  };

  return (
    <>
      <PageHeader title="Reportes Financieros" description="Consolidado de ingresos, costos y margen por ocurrencia." />
      <Card>
        <div className="mb-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Input label="Desde" type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
          <Input label="Hasta" type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
          <label className="flex items-end gap-2 pb-2 text-sm text-textDark md:col-span-2">
            <input
              type="checkbox"
              checked={soloRealizados}
              onChange={(e) => setSoloRealizados(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            Solo tours realizados
          </label>
        </div>
        {errorMessage ? <p className="mb-3 text-sm text-danger">{errorMessage}</p> : null}
        <div className="mb-3 flex flex-col gap-2 sm:flex-row">
          <Button
            className="inline-flex items-center justify-center gap-2"
            onClick={() => void buildReport()}
            disabled={isLoading}
          >
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
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-neutral">
                <th className="py-2 pr-3 font-medium">Tour</th>
                <th className="py-2 pr-3 font-medium">Ingresos</th>
                <th className="py-2 pr-3 font-medium">Costos</th>
                <th className="py-2 pr-3 font-medium">Margen</th>
                <th className="py-2 font-medium">Fecha salida</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row[0]}-${row[4]}`} className="border-b border-border/80">
                  <td className="py-2 pr-3 text-textDark">{row[0]}</td>
                  <td className="py-2 pr-3 font-mono text-textDark">{row[1]}</td>
                  <td className="py-2 pr-3 font-mono text-textDark">{row[2]}</td>
                  <td className="py-2 pr-3 font-mono text-textDark">{row[3]}</td>
                  <td className="py-2 text-textDark">{row[4]}</td>
                </tr>
              ))}
            </tbody>
            {rows.length > 0 ? (
              <tfoot>
                <tr className="border-t-2 border-border font-medium text-textDark">
                  <td className="py-2 pr-3">Totales</td>
                  <td className="py-2 pr-3 font-mono">${totales.ingresos.toFixed(2)}</td>
                  <td className="py-2 pr-3 font-mono">${totales.costos.toFixed(2)}</td>
                  <td className="py-2 pr-3 font-mono">${totales.margen.toFixed(2)}</td>
                  <td className="py-2" />
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </Card>
    </>
  );
}
