import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toursService } from "@/services/toursService";
import { pagosService } from "@/services/pagosService";
import { comprasService } from "@/services/comprasService";
import { inscripcionesService } from "@/services/inscripcionesService";
import { calculateTourMargin } from "@/utils/financiero.utils";
import { generateVagosListPdf } from "@/utils/pdf.utils";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { registerAuditLog } from "@/services/auditoriaService";
import { toServiceErrorMessage } from "@/services/serviceErrors";
import { TourDetailPanel } from "@/pages/tours/components/TourDetailPanel";
import type { TourOcurrencia } from "@/types/tour.types";
import type { Inscripcion } from "@/types/inscripcion.types";
import type { Compra } from "@/types/compra.types";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [toursCatalog, setToursCatalog] = useState<TourOcurrencia[]>([]);
  const [finanzasTourId, setFinanzasTourId] = useState<string>("");
  const [tourDetalle, setTourDetalle] = useState<TourOcurrencia | null>(null);
  const [inscripcionesFinanzas, setInscripcionesFinanzas] = useState<Inscripcion[]>([]);
  const [comprasFinanzas, setComprasFinanzas] = useState<Compra[]>([]);
  const [finanzasError, setFinanzasError] = useState<string | null>(null);
  const [finanzasLoading, setFinanzasLoading] = useState<boolean>(false);

  const [fechaDesde, setFechaDesde] = useState<string>(() => startOfCurrentMonth());
  const [fechaHasta, setFechaHasta] = useState<string>(() => endOfCurrentMonth());
  const [soloRealizados, setSoloRealizados] = useState<boolean>(true);
  const [rows, setRows] = useState<Array<[string, string, string, string, string]>>([]);
  const [comprasGeneralesTotal, setComprasGeneralesTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const list = await toursService.list();
        setToursCatalog(list.sort((a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime()));
      } catch (error) {
        setFinanzasError(toServiceErrorMessage(error));
      }
    };
    void loadCatalog();
  }, []);

  useEffect(() => {
    const fromUrl = searchParams.get("tour");
    if (!fromUrl || toursCatalog.length === 0) {
      return;
    }
    if (!toursCatalog.some((t) => t.id === fromUrl)) {
      return;
    }
    setFinanzasTourId(fromUrl);
    const next = new URLSearchParams(searchParams);
    next.delete("tour");
    setSearchParams(next, { replace: true });
  }, [toursCatalog, searchParams, setSearchParams]);

  useEffect(() => {
    if (!finanzasTourId) {
      setTourDetalle(null);
      setInscripcionesFinanzas([]);
      setComprasFinanzas([]);
      return;
    }
    const load = async () => {
      setFinanzasLoading(true);
      setFinanzasError(null);
      try {
        const [tour, inscripcionesData, comprasData] = await Promise.all([
          toursService.getById(finanzasTourId),
          inscripcionesService.listByTour(finanzasTourId),
          comprasService.listByTour(finanzasTourId),
        ]);
        setTourDetalle(tour);
        setInscripcionesFinanzas(inscripcionesData);
        setComprasFinanzas(comprasData);
      } catch (error) {
        setFinanzasError(toServiceErrorMessage(error));
      } finally {
        setFinanzasLoading(false);
      }
    };
    void load();
  }, [finanzasTourId]);

  const finanzasMetrics = useMemo(() => {
    if (!tourDetalle) {
      return null;
    }
    const inscripcionesActivas = inscripcionesFinanzas.filter((i) => i.estado !== "cancelado").length;
    const ingresosRecibidos = inscripcionesFinanzas.reduce((total, item) => total + item.montoPagado, 0);
    const ingresosEsperados = tourDetalle.precioVenta * inscripcionesActivas;
    const costoCompras = comprasFinanzas.reduce((total, item) => total + item.monto, 0);
    const financial = calculateTourMargin(
      ingresosRecibidos,
      tourDetalle.costoTransporte ?? 0,
      costoCompras,
      tourDetalle.costosExtras ?? 0,
      ingresosEsperados,
    );
    return {
      inscripcionesActivas,
      cupoMaximo: tourDetalle.cupoMaximo,
      ingresosEsperados,
      ingresosRecibidos,
      costoCompras,
      costoTransporte: tourDetalle.costoTransporte ?? 0,
      costosExtras: tourDetalle.costosExtras ?? 0,
      ...financial,
    };
  }, [tourDetalle, inscripcionesFinanzas, comprasFinanzas]);

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
      <PageHeader
        title="Reportes Financieros"
        description="Detalle y finanzas por ocurrencia, y consolidado por rango de fechas."
      />

      <Card className="mb-6">
        <h2 className="mb-3 font-heading text-lg text-textDark">Detalle y finanzas por tour</h2>
        <p className="mb-3 text-sm text-neutral">
          Seleccione una ocurrencia para ver cupos, ingresos esperados y recibidos, costos y margen.
        </p>
        <label className="mb-4 flex max-w-xl flex-col gap-1 text-sm">
          <span>Tour</span>
          <select
            className="rounded-md border border-border px-3 py-2"
            value={finanzasTourId}
            onChange={(e) => setFinanzasTourId(e.target.value)}
          >
            <option value="">Seleccione un tour</option>
            {toursCatalog.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre} — {new Date(t.fechaInicio).toLocaleDateString("es-SV")} ({t.estado})
              </option>
            ))}
          </select>
        </label>
        {finanzasError ? <p className="mb-3 text-sm text-danger">{finanzasError}</p> : null}
        {finanzasLoading ? <p className="text-sm text-neutral">Cargando datos del tour…</p> : null}
        {!finanzasLoading && finanzasTourId && finanzasMetrics && tourDetalle ? (
          <TourDetailPanel
            costoCompras={finanzasMetrics.costoCompras}
            costoTotal={finanzasMetrics.costoTotal}
            costosExtras={finanzasMetrics.costosExtras}
            costoTransporte={finanzasMetrics.costoTransporte}
            cupoMaximo={finanzasMetrics.cupoMaximo}
            ingresosEsperados={finanzasMetrics.ingresosEsperados}
            ingresosRecibidos={finanzasMetrics.ingresosRecibidos}
            inscripcionesActivas={finanzasMetrics.inscripcionesActivas}
            margenGanancia={finanzasMetrics.margenGanancia}
            margenPorcentajeSobreIngresos={finanzasMetrics.margenPorcentajeSobreIngresos}
            selectedTour={tourDetalle}
          />
        ) : null}
        {!finanzasLoading && !finanzasTourId ? (
          <p className="text-sm text-neutral">Elija un tour en la lista para cargar los indicadores.</p>
        ) : null}
      </Card>

      <Card>
        <h2 className="mb-3 font-heading text-lg text-textDark">Reporte consolidado</h2>
        <p className="mb-4 text-sm text-neutral">Ingresos, costos y margen por ocurrencia en un rango de fechas.</p>
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
