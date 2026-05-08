import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { ComprasPanel } from "@/pages/tours/components/ComprasPanel";
import { categoriasCompraService } from "@/services/categoriasCompraService";
import { comprasService } from "@/services/comprasService";
import { toursService } from "@/services/toursService";
import { toServiceErrorMessage } from "@/services/serviceErrors";
import type { Compra } from "@/types/compra.types";
import type { CategoriaCompra } from "@/types/categoriaCompra.types";
import type { TourOcurrencia } from "@/types/tour.types";

export function ComprasPage() {
  const [tours, setTours] = useState<TourOcurrencia[]>([]);
  const [selectedTourId, setSelectedTourId] = useState<string>("");
  const [categorias, setCategorias] = useState<CategoriaCompra[]>([]);
  const [comprasTour, setComprasTour] = useState<Compra[]>([]);
  const [comprasGenerales, setComprasGenerales] = useState<Compra[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const reloadLists = useCallback(async () => {
    const [generales, cats] = await Promise.all([comprasService.listGeneral(), categoriasCompraService.listActive()]);
    setComprasGenerales(generales);
    setCategorias(cats);
    if (selectedTourId) {
      setComprasTour(await comprasService.listByTour(selectedTourId));
    } else {
      setComprasTour([]);
    }
  }, [selectedTourId]);

  useEffect(() => {
    const load = async () => {
      try {
        setErrorMessage(null);
        const [toursData, generales, cats] = await Promise.all([
          toursService.list(),
          comprasService.listGeneral(),
          categoriasCompraService.listActive(),
        ]);
        setTours(toursData.sort((a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime()));
        setComprasGenerales(generales);
        setCategorias(cats);
      } catch (error) {
        setErrorMessage(toServiceErrorMessage(error));
      }
    };
    void load();
  }, []);

  useEffect(() => {
    const loadTourCompras = async () => {
      if (!selectedTourId) {
        setComprasTour([]);
        return;
      }
      try {
        setComprasTour(await comprasService.listByTour(selectedTourId));
      } catch (error) {
        setErrorMessage(toServiceErrorMessage(error));
      }
    };
    void loadTourCompras();
  }, [selectedTourId]);

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

  return (
    <>
      <PageHeader
        title="Compras"
        description="Registra compras generales o asociadas a un Tour."
      />
      {errorMessage ? <p className="mb-4 rounded-md bg-danger/10 p-3 text-sm text-danger">{errorMessage}</p> : null}
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
          onCreate={createCompra}
          onDelete={deleteCompra}
          onUpdate={updateCompra}
        />
      </div>
    </>
  );
}
