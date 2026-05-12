import { useCallback, useEffect, useMemo, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ComprasCharts } from "@/pages/compras/components/ComprasCharts";
import { ComprasPanel } from "@/pages/tours/components/ComprasPanel";
import { KpiCard } from "@/pages/dashboard/components/KpiCard";
import { categoriasCompraService } from "@/services/categoriasCompraService";
import { comprasService } from "@/services/comprasService";
import { toursService } from "@/services/toursService";
import { toServiceErrorMessage } from "@/services/serviceErrors";
import type { Compra } from "@/types/compra.types";
import type { CategoriaCompra } from "@/types/categoriaCompra.types";
import type { TourOcurrencia } from "@/types/tour.types";

function startOfCurrentMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfCurrentMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function ComprasPage() {
  const [tours, setTours] = useState<TourOcurrencia[]>([]);
  const [selectedTourId, setSelectedTourId] = useState<string>("");
  const [categorias, setCategorias] = useState<CategoriaCompra[]>([]);
  const [todasCompras, setTodasCompras] = useState<Compra[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRegistrarOpen, setIsRegistrarOpen] = useState<boolean>(false);

  const comprasGenerales = useMemo(
    () => todasCompras.filter((c) => c.tourId == null || c.tourId === ""),
    [todasCompras],
  );

  const comprasTour = useMemo(() => {
    if (!selectedTourId) {
      return [];
    }
    return todasCompras.filter((c) => c.tourId === selectedTourId);
  }, [todasCompras, selectedTourId]);

  const kpis = useMemo(() => {
    const desde = startOfCurrentMonth();
    const hasta = endOfCurrentMonth();
    let totalMes = 0;
    let countMes = 0;
    for (const c of todasCompras) {
      const f = c.fecha instanceof Date ? c.fecha : new Date(c.fecha);
      if (f >= desde && f <= hasta) {
        totalMes += c.monto;
        countMes += 1;
      }
    }
    const totalHistorico = todasCompras.reduce((acc, c) => acc + c.monto, 0);
    return {
      totalMes,
      countMes,
      totalHistorico,
      totalItems: todasCompras.length,
    };
  }, [todasCompras]);

  const reloadLists = useCallback(async () => {
    const [all, cats] = await Promise.all([comprasService.listAll(), categoriasCompraService.listActive()]);
    setTodasCompras(all);
    setCategorias(cats);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setErrorMessage(null);
        const [toursData, all, cats] = await Promise.all([
          toursService.list(),
          comprasService.listAll(),
          categoriasCompraService.listActive(),
        ]);
        setTours(toursData.sort((a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime()));
        setTodasCompras(all);
        setCategorias(cats);
      } catch (error) {
        setErrorMessage(toServiceErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  const createCompra = async (payload: Omit<Compra, "id" | "creadoEn" | "actualizadoEn">) => {
    if (isSubmitting) {
      return;
    }
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await comprasService.create(payload);
      await reloadLists();
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateCompra = async (
    compraId: string,
    payload: Partial<Omit<Compra, "id" | "creadoEn" | "actualizadoEn">>,
  ) => {
    if (isSubmitting) {
      return;
    }
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await comprasService.update(compraId, payload);
      await reloadLists();
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteCompra = async (compraId: string) => {
    if (isSubmitting) {
      return;
    }
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await comprasService.remove(compraId);
      await reloadLists();
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const currency = new Intl.NumberFormat("es-SV", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <>
      <PageHeader
        title="Compras"
        description="Consulta gastos, categorías y registra nuevas compras generales o por tour."
        actions={
          <Button type="button" onClick={() => setIsRegistrarOpen(true)}>
            Registrar compra
          </Button>
        }
      />
      {errorMessage ? <p className="mb-4 rounded-md bg-danger/10 p-3 text-sm text-danger">{errorMessage}</p> : null}
      {isLoading ? (
        <p className="mb-4 text-sm text-neutral">Cargando compras...</p>
      ) : (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard
              icon={<ShoppingCart className="h-4 w-4" />}
              label="Gasto del mes"
              value={currency.format(kpis.totalMes)}
              sub={`${kpis.countMes} compra(s) en el mes actual`}
            />
            <KpiCard
              icon={<ShoppingCart className="h-4 w-4" />}
              label="Total histórico"
              value={currency.format(kpis.totalHistorico)}
              sub={`${kpis.totalItems} registro(s)`}
            />
            <KpiCard
              icon={<ShoppingCart className="h-4 w-4" />}
              label="Promedio por registro"
              value={
                kpis.totalItems > 0 ? currency.format(kpis.totalHistorico / kpis.totalItems) : currency.format(0)
              }
              sub="Sobre todas las compras cargadas"
            />
          </div>
          <ComprasCharts compras={todasCompras} />
        </>
      )}
      <Card className="mb-4">
        <h2 className="mb-2 font-heading text-lg text-textDark">Tour de contexto</h2>
        <p className="mb-3 text-sm text-neutral">
          Opcional: al elegir un tour verás sus compras asociadas y podrás marcar nuevas compras para ese tour. Las compras
          generales no requieren tour.
        </p>
        <label className="flex max-w-xl flex-col gap-1 text-sm">
          <span>Tour</span>
          <select
            className="rounded-md border border-border px-3 py-2"
            value={selectedTourId}
            onChange={(e) => setSelectedTourId(e.target.value)}
          >
            <option value="">Ninguno (solo compras generales en el formulario)</option>
            {tours.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre} — {new Date(t.fechaInicio).toLocaleDateString("es-SV")} ({t.estado})
              </option>
            ))}
          </select>
        </label>
      </Card>
      <div className="grid gap-4 xl:grid-cols-3 [&>*]:min-w-0">
        <ComprasPanel
          associationTourId={selectedTourId}
          categorias={categorias}
          comprasGenerales={comprasGenerales}
          comprasTour={comprasTour}
          isSubmitting={isSubmitting}
          showCreateForm={isRegistrarOpen}
          onCancelRegister={() => setIsRegistrarOpen(false)}
          onRegisterSuccess={() => setIsRegistrarOpen(false)}
          onCreate={createCompra}
          onDelete={deleteCompra}
          onUpdate={updateCompra}
        />
      </div>
    </>
  );
}
