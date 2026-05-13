import { useEffect, useMemo, useState } from "react";
import { History } from "lucide-react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Table } from "@/components/ui/Table";
import { TableActions } from "@/components/ui/TableActions";
import { useAuth } from "@/hooks/useAuth";
import { plantillasService } from "@/services/plantillasService";
import { softDeleteService } from "@/services/softDeleteService";
import { terrenosService } from "@/services/terrenosService";
import { toursService } from "@/services/toursService";
import { calculateTourMargin } from "@/utils/financiero.utils";
import { pagosService } from "@/services/pagosService";
import { comprasService } from "@/services/comprasService";
import { inscripcionesService } from "@/services/inscripcionesService";
import { toServiceErrorMessage } from "@/services/serviceErrors";
import { plantillaFormSchema, type PlantillaFormValues } from "@/utils/validaciones";
import {
  OPCIONES_DIFICULTAD_PLANTILLA,
  calcularDificultadSugerida,
  normalizarDificultadDesdeTexto,
  obtenerEtiquetaDificultad,
} from "@/utils/dificultad";
import type { Terreno } from "@/types/terreno.types";
import type { TourDificultad, TourPlantilla } from "@/types/tour.types";

const defaultValues: PlantillaFormValues = {
  nombre: "",
  descripcion: "",
  dificultad: "",
  dificultadId: "",
  distanciaKm: undefined,
  elevacionM: undefined,
  alturaMaximaMsnm: undefined,
  terrenos: [],
  wikiloc: "",
  equipoRecomendado: "",
  queLlevar: "",
  itinerarioTipo: "",
  serviciosExtras: "",
  politicaCancelacion: "",
  tiempoEstimado: "",
  precioBase: 0,
  activa: true,
};

export function PlantillasPage() {
  const { profile } = useAuth();
  const [plantillas, setPlantillas] = useState<TourPlantilla[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [terrenos, setTerrenos] = useState<Terreno[]>([]);
  const [selectedPlantilla, setSelectedPlantilla] = useState<TourPlantilla | null>(null);
  const [plantillaDetail, setPlantillaDetail] = useState<TourPlantilla | null>(null);
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
      await Promise.all([loadPlantillas(), terrenosService.listActive().then(setTerrenos)]);
    })();
  }, []);

  const factoresPorTerrenoId = useMemo(
    () => Object.fromEntries(terrenos.map((terreno) => [terreno.id, terreno.factor])),
    [terrenos],
  );

  const camposCalculo = useWatch({
    control: form.control,
    name: ["distanciaKm", "elevacionM", "alturaMaximaMsnm", "terrenos"],
  });
  const [watchedDistanciaKm, watchedElevacionM, watchedAlturaMaxima, watchedTerrenos] = camposCalculo;

  const sugerenciaDificultad = useMemo(
    () =>
      calcularDificultadSugerida(
        {
          distanciaKm: watchedDistanciaKm,
          elevacionM: watchedElevacionM,
          alturaMaximaMsnm: watchedAlturaMaxima,
          terrenos: watchedTerrenos ?? [],
        },
        factoresPorTerrenoId,
      ),
    [watchedDistanciaKm, watchedElevacionM, watchedAlturaMaxima, watchedTerrenos, factoresPorTerrenoId],
  );

  const aplicarSugerencia = () => {
    const clave = sugerenciaDificultad.dificultad;
    form.setValue("dificultad", clave, { shouldDirty: true, shouldValidate: true });
    form.setValue("dificultadId", clave, { shouldDirty: true });
  };

  const openCreateModal = () => {
    setSelectedPlantilla(null);
    setSuccessMessage(null);
    form.reset(defaultValues);
    setIsFormModalOpen(true);
  };

  const openEditModal = (plantilla: TourPlantilla) => {
    setSelectedPlantilla(plantilla);
    setSuccessMessage(null);
    const claveFormulario =
      normalizarDificultadDesdeTexto(String(plantilla.dificultad ?? "")) ??
      normalizarDificultadDesdeTexto(String(plantilla.dificultadId ?? "")) ??
      "";
    form.reset({
      nombre: plantilla.nombre,
      descripcion: plantilla.descripcion,
      dificultad: claveFormulario as TourDificultad | "",
      dificultadId: claveFormulario,
      distanciaKm: plantilla.distanciaKm,
      elevacionM: plantilla.elevacionM,
      alturaMaximaMsnm: plantilla.alturaMaximaMsnm,
      terrenos: plantilla.terrenos ?? [],
      wikiloc: plantilla.wikiloc ?? "",
      equipoRecomendado: plantilla.equipoRecomendado ?? "",
      queLlevar: plantilla.queLlevar ?? "",
      itinerarioTipo: plantilla.itinerarioTipo ?? "",
      serviciosExtras: plantilla.serviciosExtras ?? "",
      politicaCancelacion: plantilla.politicaCancelacion ?? "",
      tiempoEstimado: plantilla.tiempoEstimado ?? "",
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
      const dificultadSeleccionada = values.dificultad as TourDificultad;
      const payload = {
        ...values,
        dificultad: dificultadSeleccionada,
        dificultadId: dificultadSeleccionada,
        puntajeDificultad: sugerenciaDificultad.puntaje,
        dificultadCalculada: sugerenciaDificultad.dificultad,
      };
      if (selectedPlantilla) {
        await plantillasService.update(selectedPlantilla.id, payload);
        setSuccessMessage("Plantilla actualizada exitosamente.");
      } else {
        await plantillasService.create({
          ...payload,
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
      const ocurrencias = await toursService.listByPlantilla(plantilla.id, { includeInactive: true });
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
      await softDeleteService.softDelete("tour_plantillas", plantillaToDelete.id, {
        usuarioId: profile?.id ?? "sistema",
        usuarioEmail: profile?.email ?? "",
      });
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
          headers={["Nombre", "Dificultad", "Distancia y Tiempo", "Precio base", "Estado", "Acciones"]}
          rows={plantillas.map((item) => ({
            key: item.id,
            cells: [
              item.nombre,
              item.dificultad
                ? `${(() => {
                    const claveFila = normalizarDificultadDesdeTexto(String(item.dificultad));
                    return claveFila ? obtenerEtiquetaDificultad(claveFila) : String(item.dificultad);
                  })()}${
                    (() => {
                      const guardada = normalizarDificultadDesdeTexto(String(item.dificultad ?? ""));
                      const calculada = normalizarDificultadDesdeTexto(String(item.dificultadCalculada ?? ""));
                      return calculada && guardada && calculada !== guardada ? " *" : "";
                    })()
                  }`
                : "—",
              `${item.distanciaKm ? item.distanciaKm + " km" : "—"} / ${item.tiempoEstimado ?? "—"}`,
              `$${item.precioBase.toFixed(2)}`,
              item.activa ? "Activa" : "Inactiva",
              <div key={`act-${item.id}`} className="flex flex-wrap items-center gap-1">
                <Button size="icon" type="button" variant="ghost" title="Ocurrencias" onClick={() => void openHistorialPlantilla(item)}>
                  <History className="h-4 w-4" />
                </Button>
                <TableActions onDelete={() => setPlantillaToDelete(item)} onEdit={() => openEditModal(item)} onView={() => setPlantillaDetail(item)} />
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
            <Input
              label="Distancia (km)"
              type="number"
              step="0.1"
              {...form.register("distanciaKm", { valueAsNumber: true })}
              error={form.formState.errors.distanciaKm?.message}
            />
            <Input label="Tiempo estimado" {...form.register("tiempoEstimado")} />
            <Input
              label="Elevación acumulada (m)"
              type="number"
              {...form.register("elevacionM", { valueAsNumber: true })}
              error={form.formState.errors.elevacionM?.message}
            />
            <Input
              label="Altura máxima (msnm)"
              type="number"
              {...form.register("alturaMaximaMsnm", { valueAsNumber: true })}
              error={form.formState.errors.alturaMaximaMsnm?.message}
            />
            <Input
              label="Precio base"
              type="number"
              {...form.register("precioBase", { valueAsNumber: true })}
              error={form.formState.errors.precioBase?.message}
            />
            <fieldset className="md:col-span-2 rounded-md border border-border p-3">
              <legend className="px-1 text-sm font-medium text-textDark">Tipo de terreno</legend>
              <p className="mb-2 text-xs text-neutral">
                Selecciona uno o varios terrenos; el sistema utilizará el factor más exigente para calcular la dificultad.
              </p>
              {terrenos.length === 0 ? (
                <p className="text-xs text-neutral">No hay terrenos activos en el catálogo. Configúralos en Administración.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {terrenos.map((terreno) => (
                    <label key={terreno.id} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        value={terreno.id}
                        className="mt-1"
                        {...form.register("terrenos")}
                      />
                      <span>
                        <span className="font-medium">{terreno.nombre}</span>
                        {terreno.descripcion ? (
                          <span className="block text-xs text-neutral">{terreno.descripcion}</span>
                        ) : null}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
            <div className="md:col-span-2 rounded-md border border-dashed border-primary/40 bg-primary/5 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-neutral">Clasificación sugerida automática</p>
                  <p className="font-medium text-textDark">
                    {obtenerEtiquetaDificultad(sugerenciaDificultad.dificultad)}{" "}
                    <span className="text-xs text-neutral">(clave: {sugerenciaDificultad.dificultad})</span>
                  </p>
                  <p className="text-xs text-neutral">
                    Puntaje: {sugerenciaDificultad.puntaje} · Factor terreno: {sugerenciaDificultad.factorTerrenoMax.toFixed(1)} · Bono altitud: +{sugerenciaDificultad.bonoAltitud}
                  </p>
                </div>
                <Button type="button" variant="ghost" onClick={aplicarSugerencia}>
                  Aplicar sugerencia
                </Button>
              </div>
            </div>
            <label className="flex flex-col gap-1 text-sm md:col-span-2">
              <span>Dificultad final</span>
              <select
                className="rounded-md border border-border px-3 py-2"
                value={form.watch("dificultad") ?? ""}
                onChange={(event) => {
                  const clave = event.target.value as TourDificultad | "";
                  form.setValue("dificultad", clave, { shouldDirty: true, shouldValidate: true });
                  form.setValue("dificultadId", clave, { shouldDirty: true });
                }}
              >
                <option value="">Selecciona dificultad</option>
                {OPCIONES_DIFICULTAD_PLANTILLA.map((opcion) => (
                  <option key={opcion.clave} value={opcion.clave}>
                    {opcion.etiqueta}
                  </option>
                ))}
              </select>
              {form.formState.errors.dificultad?.message ? (
                <span className="text-danger">{form.formState.errors.dificultad.message}</span>
              ) : null}
            </label>
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
              <span>Que incluimos</span>
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
      <Modal isOpen={Boolean(plantillaDetail)} onClose={() => setPlantillaDetail(null)} size="md" title="Detalles de la plantilla">
        {plantillaDetail ? (
          <div className="grid gap-y-4 gap-x-6 sm:grid-cols-2 text-sm text-textDark max-h-[70vh] overflow-y-auto pr-2">
            <div className="sm:col-span-2">
              <p className="font-semibold text-neutral">Nombre</p>
              <p>{plantillaDetail.nombre}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="font-semibold text-neutral">Descripción</p>
              <p className="whitespace-pre-wrap">{plantillaDetail.descripcion}</p>
            </div>
            <div>
              <p className="font-semibold text-neutral">Dificultad</p>
              <p>
                {(() => {
                  const dif = normalizarDificultadDesdeTexto(String(plantillaDetail.dificultad));
                  return dif ? obtenerEtiquetaDificultad(dif) : String(plantillaDetail.dificultad || "—");
                })()}
              </p>
            </div>
            <div>
              <p className="font-semibold text-neutral">Precio Base</p>
              <p>${plantillaDetail.precioBase?.toFixed(2)}</p>
            </div>
            <div>
              <p className="font-semibold text-neutral">Distancia</p>
              <p>{plantillaDetail.distanciaKm ? `${plantillaDetail.distanciaKm} km` : "—"}</p>
            </div>
            <div>
              <p className="font-semibold text-neutral">Tiempo Estimado</p>
              <p>{plantillaDetail.tiempoEstimado || "—"}</p>
            </div>
            <div>
              <p className="font-semibold text-neutral">Elevación</p>
              <p>{plantillaDetail.elevacionM ? `${plantillaDetail.elevacionM} m` : "—"}</p>
            </div>
            <div>
              <p className="font-semibold text-neutral">Altura Máxima</p>
              <p>{plantillaDetail.alturaMaximaMsnm ? `${plantillaDetail.alturaMaximaMsnm} msnm` : "—"}</p>
            </div>
            <div>
              <p className="font-semibold text-neutral">Estado</p>
              <p>{plantillaDetail.activa ? "Activa" : "Inactiva"}</p>
            </div>
            {plantillaDetail.wikiloc ? (
              <div className="sm:col-span-2">
                <p className="font-semibold text-neutral">Wikiloc</p>
                <a href={plantillaDetail.wikiloc} target="_blank" rel="noreferrer" className="text-primary underline break-all">
                  {plantillaDetail.wikiloc}
                </a>
              </div>
            ) : null}
            {plantillaDetail.equipoRecomendado ? (
              <div className="sm:col-span-2">
                <p className="font-semibold text-neutral">Equipo Recomendado</p>
                <p className="whitespace-pre-wrap">{plantillaDetail.equipoRecomendado}</p>
              </div>
            ) : null}
            {plantillaDetail.queLlevar ? (
              <div className="sm:col-span-2">
                <p className="font-semibold text-neutral">Qué llevar</p>
                <p className="whitespace-pre-wrap">{plantillaDetail.queLlevar}</p>
              </div>
            ) : null}
            {plantillaDetail.serviciosExtras ? (
              <div className="sm:col-span-2">
                <p className="font-semibold text-neutral">Qué incluimos</p>
                <p className="whitespace-pre-wrap">{plantillaDetail.serviciosExtras}</p>
              </div>
            ) : null}
            {plantillaDetail.itinerarioTipo ? (
              <div className="sm:col-span-2">
                <p className="font-semibold text-neutral">Itinerario Tipo</p>
                <p className="whitespace-pre-wrap">{plantillaDetail.itinerarioTipo}</p>
              </div>
            ) : null}
            {plantillaDetail.politicaCancelacion ? (
              <div className="sm:col-span-2">
                <p className="font-semibold text-neutral">Política de cancelación</p>
                <p className="whitespace-pre-wrap">{plantillaDetail.politicaCancelacion}</p>
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="mt-6 flex justify-end">
          <Button variant="ghost" onClick={() => setPlantillaDetail(null)}>Cerrar</Button>
        </div>
      </Modal>
    </>
  );
}
