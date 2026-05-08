import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Table } from "@/components/ui/Table";
import { TableActions } from "@/components/ui/TableActions";
import { useAuth } from "@/hooks/useAuth";
import { dificultadesPlantillaService } from "@/services/dificultadesPlantillaService";
import { plantillasService } from "@/services/plantillasService";
import { toursService } from "@/services/toursService";
import { calculateTourMargin } from "@/utils/financiero.utils";
import { pagosService } from "@/services/pagosService";
import { comprasService } from "@/services/comprasService";
import { inscripcionesService } from "@/services/inscripcionesService";
import { toServiceErrorMessage } from "@/services/serviceErrors";
import { plantillaFormSchema, type PlantillaFormValues } from "@/utils/validaciones";
import type { DificultadPlantilla } from "@/types/dificultadPlantilla.types";
import type { TourPlantilla } from "@/types/tour.types";

const defaultValues: PlantillaFormValues = {
  nombre: "",
  descripcion: "",
  dificultad: "",
  dificultadId: "",
  distanciaKm: undefined,
  elevacionM: undefined,
  wikiloc: "",
  equipoRecomendado: "",
  queLlevar: "",
  itinerarioTipo: "",
  serviciosExtras: "",
  politicaCancelacion: "",
  precioBase: 0,
  activa: true,
};

export function PlantillasPage() {
  const { profile } = useAuth();
  const [plantillas, setPlantillas] = useState<TourPlantilla[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [dificultades, setDificultades] = useState<DificultadPlantilla[]>([]);
  const [selectedPlantilla, setSelectedPlantilla] = useState<TourPlantilla | null>(null);
  const [plantillaToDelete, setPlantillaToDelete] = useState<TourPlantilla | null>(null);
  const [historialPlantilla, setHistorialPlantilla] = useState<TourPlantilla | null>(null);
  const [historialOcurrencias, setHistorialOcurrencias] = useState<Array<[string, string, string, string, string]>>([]);
  const [isHistorialLoading, setIsHistorialLoading] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const form = useForm<PlantillaFormValues>({
    resolver: zodResolver(plantillaFormSchema) as Resolver<PlantillaFormValues>,
    defaultValues,
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const loadPlantillas = async () => {
    try {
      setErrorMessage(null);
      setPlantillas(await plantillasService.list());
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    }
  };

  useEffect(() => {
    void (async () => {
      await Promise.all([loadPlantillas(), dificultadesPlantillaService.listActive().then(setDificultades)]);
    })();
  }, []);

  const openCreateModal = () => {
    setSelectedPlantilla(null);
    setSuccessMessage(null);
    form.reset(defaultValues);
    setIsFormModalOpen(true);
  };

  const openEditModal = (plantilla: TourPlantilla) => {
    setSelectedPlantilla(plantilla);
    setSuccessMessage(null);
    form.reset({
      nombre: plantilla.nombre,
      descripcion: plantilla.descripcion,
      dificultad: plantilla.dificultad,
      dificultadId: plantilla.dificultadId ?? "",
      distanciaKm: plantilla.distanciaKm,
      elevacionM: plantilla.elevacionM,
      wikiloc: plantilla.wikiloc ?? "",
      equipoRecomendado: plantilla.equipoRecomendado ?? "",
      queLlevar: plantilla.queLlevar ?? "",
      itinerarioTipo: plantilla.itinerarioTipo ?? "",
      serviciosExtras: plantilla.serviciosExtras ?? "",
      politicaCancelacion: plantilla.politicaCancelacion ?? "",
      precioBase: plantilla.precioBase,
      activa: plantilla.activa,
    });
    setIsFormModalOpen(true);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setSelectedPlantilla(null);
    form.reset(defaultValues);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);
      if (selectedPlantilla) {
        await plantillasService.update(selectedPlantilla.id, values);
        setSuccessMessage("Plantilla actualizada exitosamente.");
      } else {
        await plantillasService.create({
          ...values,
          creadoPor: profile?.id ?? "sistema",
        });
        setSuccessMessage("Plantilla registrada exitosamente.");
      }
      closeFormModal();
      await loadPlantillas();
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    }
  });

  const openHistorialPlantilla = async (plantilla: TourPlantilla) => {
    setHistorialPlantilla(plantilla);
    setHistorialOcurrencias([]);
    setIsHistorialLoading(true);
    setErrorMessage(null);
    try {
      const ocurrencias = await toursService.listByPlantilla(plantilla.id);
      const rows: Array<[string, string, string, string, string]> = [];
      for (const tour of ocurrencias) {
        const [pagos, compras] = await Promise.all([
          pagosService.listByTour(tour.id),
          comprasService.listByTour(tour.id),
        ]);
        const ingresos = pagos.reduce((t, p) => t + p.monto, 0);
        const costoCompras = compras.reduce((t, c) => t + c.monto, 0);
        const margin = calculateTourMargin(ingresos, tour.costoTransporte ?? 0, costoCompras, tour.costosExtras ?? 0);
        const inscritos = String(await inscripcionesService.countActivas(tour.id));
        rows.push([
          new Date(tour.fechaInicio).toLocaleDateString("es-SV"),
          tour.estado,
          inscritos,
          ingresos.toFixed(2),
          margin.margenGanancia.toFixed(2),
        ]);
      }
      setHistorialOcurrencias(rows);
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    } finally {
      setIsHistorialLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!plantillaToDelete) {
      return;
    }

    try {
      setErrorMessage(null);
      await plantillasService.update(plantillaToDelete.id, { activa: false });
      setPlantillaToDelete(null);
      setSuccessMessage("Plantilla eliminada del listado activo.");
      await loadPlantillas();
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    }
  };

  return (
    <>
      <PageHeader title="Plantillas de Tour" description="Ficha maestra para crear ocurrencias reutilizables." />
      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="font-heading text-lg">Listado de plantillas</h3>
          <Button onClick={openCreateModal}>Agregar plantilla</Button>
        </div>
        {errorMessage ? <p className="mb-3 text-sm text-danger">{errorMessage}</p> : null}
        {successMessage ? <p className="mb-3 text-sm text-success">{successMessage}</p> : null}
        <Table
          emptyMessage="No hay plantillas registradas."
          headers={["Nombre", "Dificultad", "Precio base", "Estado", "Acciones"]}
          rows={plantillas.map((item) => ({
            key: item.id,
            cells: [
              item.nombre,
              item.dificultad,
              `$${item.precioBase.toFixed(2)}`,
              item.activa ? "Activa" : "Inactiva",
              <div key={`act-${item.id}`} className="flex flex-wrap gap-2">
                <Button type="button" variant="ghost" onClick={() => void openHistorialPlantilla(item)}>
                  Ocurrencias
                </Button>
                <TableActions onDelete={() => setPlantillaToDelete(item)} onEdit={() => openEditModal(item)} />
              </div>,
            ],
          }))}
        />
      </Card>
      <Modal
        isOpen={isFormModalOpen}
        onClose={closeFormModal}
        size="lg"
        title={selectedPlantilla ? "Editar plantilla" : "Agregar plantilla"}
      >
        <form className="space-y-3" onSubmit={(event) => void onSubmit(event)}>
          <Input label="Nombre" {...form.register("nombre")} error={form.formState.errors.nombre?.message} />
          <label className="flex flex-col gap-1 text-sm">
            <span>Descripción</span>
            <textarea className="min-h-28 rounded-md border border-border px-3 py-2" {...form.register("descripcion")} />
            {form.formState.errors.descripcion?.message ? (
              <span className="text-danger">{form.formState.errors.descripcion.message}</span>
            ) : null}
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span>Dificultad</span>
              <select className="rounded-md border border-border px-3 py-2" {...form.register("dificultad")}>
                <option value="">Selecciona dificultad</option>
                {dificultades.map((item) => (
                  <option key={item.id} value={item.nombre}>
                    {item.nombre}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label="Precio base"
              type="number"
              {...form.register("precioBase", { valueAsNumber: true })}
              error={form.formState.errors.precioBase?.message}
            />
            <Input
              label="Distancia (km)"
              type="number"
              {...form.register("distanciaKm", { valueAsNumber: true })}
              error={form.formState.errors.distanciaKm?.message}
            />
            <Input
              label="Elevación (m)"
              type="number"
              {...form.register("elevacionM", { valueAsNumber: true })}
              error={form.formState.errors.elevacionM?.message}
            />
            <Input label="Wikiloc (URL)" {...form.register("wikiloc")} />
            <label className="flex flex-col gap-1 text-sm md:col-span-2">
              <span>Equipo recomendado</span>
              <textarea className="min-h-20 rounded-md border border-border px-3 py-2" {...form.register("equipoRecomendado")} />
            </label>
            <label className="flex flex-col gap-1 text-sm md:col-span-2">
              <span>Qué llevar</span>
              <textarea className="min-h-20 rounded-md border border-border px-3 py-2" {...form.register("queLlevar")} />
            </label>
            <label className="flex flex-col gap-1 text-sm md:col-span-2">
              <span>Itinerario tipo</span>
              <textarea className="min-h-24 rounded-md border border-border px-3 py-2" {...form.register("itinerarioTipo")} />
            </label>
            <label className="flex flex-col gap-1 text-sm md:col-span-2">
              <span>Servicios extras</span>
              <textarea className="min-h-20 rounded-md border border-border px-3 py-2" {...form.register("serviciosExtras")} />
            </label>
            <label className="flex flex-col gap-1 text-sm md:col-span-2">
              <span>Política de cancelación</span>
              <textarea className="min-h-20 rounded-md border border-border px-3 py-2" {...form.register("politicaCancelacion")} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...form.register("activa")} />
            Plantilla activa
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={closeFormModal}>
              Cancelar
            </Button>
            <Button disabled={form.formState.isSubmitting} type="submit">
              {form.formState.isSubmitting ? "Guardando..." : selectedPlantilla ? "Actualizar plantilla" : "Guardar plantilla"}
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        isOpen={Boolean(historialPlantilla)}
        onClose={() => setHistorialPlantilla(null)}
        size="lg"
        title={historialPlantilla ? `Ocurrencias — ${historialPlantilla.nombre}` : "Historial"}
      >
        {isHistorialLoading ? <p className="text-sm text-neutral">Cargando...</p> : null}
        <Table
          emptyMessage="No hay ocurrencias para esta plantilla."
          headers={["Fecha", "Estado", "Inscritos", "Ingresos", "Margen"]}
          rows={historialOcurrencias}
        />
      </Modal>
      <Modal isOpen={Boolean(plantillaToDelete)} onClose={() => setPlantillaToDelete(null)} size="sm" title="Eliminar plantilla">
        <p className="text-sm text-textDark">
          Se marcará como inactiva la plantilla {plantillaToDelete?.nombre}. Los tours ya creados no se modificarán.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setPlantillaToDelete(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={() => void handleDelete()}>
            Eliminar
          </Button>
        </div>
      </Modal>
    </>
  );
}
