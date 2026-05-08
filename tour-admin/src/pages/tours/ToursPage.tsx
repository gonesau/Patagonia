import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileDown } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/hooks/useAuth";
import { toursService } from "@/services/toursService";
import { transporteService } from "@/services/transporteService";
import { uploadAdminFile } from "@/services/storageUploadService";
import { comprasService } from "@/services/comprasService";
import { tourFormSchema, type TourFormValues } from "@/utils/validaciones";
import { toServiceErrorMessage } from "@/services/serviceErrors";
import { findGuiaIdsWithTourConflict, plantillaSnapshotForTour } from "@/utils/tourScheduling.utils";
import type { TourOcurrencia } from "@/types/tour.types";
import type { Transporte } from "@/types/transporte.types";
import { TourListPanel } from "./components/TourListPanel";
import { TourOperacionesPanel } from "./components/TourOperacionesPanel";
import { InscripcionesPanel } from "./components/InscripcionesPanel";
import { PagosPanel } from "./components/PagosPanel";
import { useToursPageState } from "./hooks/useToursPageState";
import { buildTourVagosReport } from "@/utils/tourReportBuilder";
import { generateTourVagosPdf } from "@/utils/pdf.utils";
import { configuracionService } from "@/services/configuracionService";

const defaultValues: TourFormValues = {
  plantillaId: "",
  nombre: "",
  estado: "borrador",
  guiaId: "",
  guiaIds: [],
  fechaInicio: "",
  fechaFin: "",
  cupoMaximo: 20,
  cupoMinimo: 8,
  precioVenta: 25,
  puntoEncuentro: "",
  transporteId: "",
  costoTransporte: 0,
  costosExtras: 0,
  recordatoriosAutomaticosHabilitados: true,
};

function toLocalDateTimeString(value: Date | undefined): string {
  if (!value) {
    return "";
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (segment: number) => segment.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function readSelectedValues(options: HTMLOptionsCollection): string[] {
  return Array.from(options)
    .filter((option) => option.selected)
    .map((option) => option.value)
    .filter((value) => value.length > 0);
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export function ToursPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.rol === "admin";
  const canVerFinanzasEnReportes = profile?.rol === "admin" || profile?.rol === "operador";
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    tours,
    plantillas,
    guias,
    vagos,
    inscripciones,
    pagos,
    estadosTourCatalog,
    metodosPagoCatalog,
    selectedTourId,
    paymentInscripcionId,
    errorMessage,
    hasMoreTours,
    isLoadingMoreTours,
    isSubmittingInscripcion,
    isSubmittingPago,
    setSelectedTourId,
    setPaymentInscripcionId,
    setErrorMessage,
    reloadTours,
    loadMoreTours,
    createInscripcion,
    createPago,
  } = useToursPageState(profile);

  useEffect(() => {
    const tourFromQuery = searchParams.get("tour");
    if (!tourFromQuery || tours.length === 0) {
      return;
    }
    if (!tours.some((item) => item.id === tourFromQuery)) {
      return;
    }
    setSelectedTourId(tourFromQuery);
    const next = new URLSearchParams(searchParams);
    next.delete("tour");
    setSearchParams(next, { replace: true });
  }, [tours, searchParams, setSearchParams, setSelectedTourId]);

  const [selectedVagoId, setSelectedVagoId] = useState<string>("");
  const [inscripcionMontoTotal, setInscripcionMontoTotal] = useState<number>(0);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethodId, setPaymentMethodId] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedTourToEdit, setSelectedTourToEdit] = useState<TourOcurrencia | null>(null);
  const [tourToDelete, setTourToDelete] = useState<TourOcurrencia | null>(null);
  const [isTourModalOpen, setIsTourModalOpen] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [unidadesTransporte, setUnidadesTransporte] = useState<Transporte[]>([]);
  const [transporteDisponibles, setTransporteDisponibles] = useState<Transporte[]>([]);
  const [capacidadAdvertencia, setCapacidadAdvertencia] = useState<string | null>(null);

  const form = useForm<TourFormValues>({
    resolver: zodResolver(tourFormSchema),
    defaultValues,
    mode: "onBlur",
    reValidateMode: "onChange",
  });
  const selectedGuideIds = useWatch({ control: form.control, name: "guiaIds" }) ?? [];
  const plantillaIdWatch = useWatch({ control: form.control, name: "plantillaId" });
  const fechaInicioWatch = useWatch({ control: form.control, name: "fechaInicio" });
  const transporteIdWatch = useWatch({ control: form.control, name: "transporteId" });
  const cupoMaxWatch = useWatch({ control: form.control, name: "cupoMaximo" }) ?? 0;

  useEffect(() => {
    if (!isAdmin) {
      return;
    }
    void transporteService.list().then(setUnidadesTransporte);
  }, [isAdmin]);

  useEffect(() => {
    if (!fechaInicioWatch || unidadesTransporte.length === 0) {
      setTransporteDisponibles(unidadesTransporte.filter((u) => u.activo));
      return;
    }
    const inicio = new Date(fechaInicioWatch);
    if (Number.isNaN(inicio.getTime())) {
      setTransporteDisponibles(unidadesTransporte.filter((u) => u.activo));
      return;
    }
    void (async () => {
      const toursThatDay = await toursService.listOnLocalDate(inicio);
      const busy = new Set<string>();
      for (const t of toursThatDay) {
        if (t.estado === "cancelado" || !t.transporteId) {
          continue;
        }
        if (selectedTourToEdit && t.id === selectedTourToEdit.id) {
          continue;
        }
        busy.add(t.transporteId);
      }
      setTransporteDisponibles(unidadesTransporte.filter((u) => u.activo && !busy.has(u.id)));
    })();
  }, [fechaInicioWatch, unidadesTransporte, selectedTourToEdit]);

  useEffect(() => {
    const unidad = unidadesTransporte.find((u) => u.id === transporteIdWatch);
    if (unidad) {
      form.setValue("costoTransporte", unidad.costoPorTour, { shouldDirty: true });
    }
  }, [transporteIdWatch, unidadesTransporte, form]);

  useEffect(() => {
    const unidad = unidadesTransporte.find((u) => u.id === transporteIdWatch);
    if (unidad && cupoMaxWatch > unidad.capacidad) {
      setCapacidadAdvertencia(
        `La capacidad del vehículo (${unidad.capacidad}) es menor al cupo máximo (${cupoMaxWatch}).`,
      );
    } else {
      setCapacidadAdvertencia(null);
    }
  }, [transporteIdWatch, unidadesTransporte, cupoMaxWatch]);

  useEffect(() => {
    if (selectedTourToEdit || !plantillaIdWatch) {
      return;
    }
    const plantilla = plantillas.find((p) => p.id === plantillaIdWatch);
    if (!plantilla) {
      return;
    }
    form.setValue("nombre", plantilla.nombre, { shouldDirty: true });
    form.setValue("precioVenta", plantilla.precioBase, { shouldDirty: true });
  }, [plantillaIdWatch, plantillas, selectedTourToEdit, form]);

  const openCreateTourModal = () => {
    setSelectedTourToEdit(null);
    setSuccessMessage(null);
    form.reset(defaultValues);
    setIsTourModalOpen(true);
  };

  const openDuplicateFromTour = (tour: TourOcurrencia) => {
    setSelectedTourToEdit(null);
    setSuccessMessage(null);
    const start = addDays(new Date(), 7);
    const end = new Date(start);
    end.setHours(end.getHours() + 8);
    form.reset({
      ...defaultValues,
      plantillaId: tour.plantillaId,
      nombre: tour.nombre,
      estado: "borrador",
      guiaId: tour.guiaId,
      guiaIds: tour.guiaIds && tour.guiaIds.length > 0 ? tour.guiaIds : tour.guiaId ? [tour.guiaId] : [],
      fechaInicio: toLocalDateTimeString(start),
      fechaFin: toLocalDateTimeString(end),
      cupoMaximo: tour.cupoMaximo,
      cupoMinimo: tour.cupoMinimo,
      precioVenta: tour.precioVenta,
      puntoEncuentro: tour.puntoEncuentro,
      transporteId: tour.transporteId ?? "",
      costoTransporte: tour.costoTransporte ?? 0,
      costosExtras: tour.costosExtras ?? 0,
      recordatoriosAutomaticosHabilitados: tour.recordatoriosAutomaticosHabilitados !== false,
    });
    setIsTourModalOpen(true);
  };

  const openEditTourModal = (tour: TourOcurrencia) => {
    setSelectedTourToEdit(tour);
    setSuccessMessage(null);
    form.reset({
      plantillaId: tour.plantillaId,
      nombre: tour.nombre,
      estado: tour.estado,
      guiaId: tour.guiaId,
      guiaIds: tour.guiaIds && tour.guiaIds.length > 0 ? tour.guiaIds : tour.guiaId ? [tour.guiaId] : [],
      fechaInicio: toLocalDateTimeString(tour.fechaInicio),
      fechaFin: toLocalDateTimeString(tour.fechaFin),
      cupoMaximo: tour.cupoMaximo,
      cupoMinimo: tour.cupoMinimo,
      precioVenta: tour.precioVenta,
      puntoEncuentro: tour.puntoEncuentro,
      transporteId: tour.transporteId ?? "",
      costoTransporte: tour.costoTransporte ?? 0,
      costosExtras: tour.costosExtras ?? 0,
      recordatoriosAutomaticosHabilitados: tour.recordatoriosAutomaticosHabilitados !== false,
    });
    setIsTourModalOpen(true);
  };

  const closeTourModal = () => {
    setIsTourModalOpen(false);
    setSelectedTourToEdit(null);
    form.reset(defaultValues);
  };

  const onTourSubmit = form.handleSubmit(async (values) => {
    if (!isAdmin) {
      return;
    }
    try {
      setErrorMessage(null);
      setSuccessMessage(null);
      const { fechaInicio, fechaFin, ...rest } = values;
      const inicioDate = new Date(fechaInicio);
      const finDate = new Date(fechaFin);
      const conflictIds = await findGuiaIdsWithTourConflict(inicioDate, values.guiaIds, selectedTourToEdit?.id);
      if (conflictIds.length > 0) {
        const ok = window.confirm(
          "Hay guías con otra ocurrencia el mismo día. ¿Deseas guardar de todas formas?",
        );
        if (!ok) {
          return;
        }
      }
      const unidad = unidadesTransporte.find((u) => u.id === values.transporteId);
      if (unidad && values.cupoMaximo > unidad.capacidad) {
        const ok = window.confirm(
          `El vehículo tiene capacidad ${unidad.capacidad} y el cupo máximo es ${values.cupoMaximo}. ¿Continuar?`,
        );
        if (!ok) {
          return;
        }
      }
      const plantilla = plantillas.find((p) => p.id === values.plantillaId);
      const snapshot = plantillaSnapshotForTour(plantilla) as Partial<TourOcurrencia>;

      let recordatorio7dEnviado = selectedTourToEdit?.recordatorio7dEnviado ?? false;
      let recordatorio1dEnviado = selectedTourToEdit?.recordatorio1dEnviado ?? false;
      if (selectedTourToEdit) {
        const oldT = new Date(selectedTourToEdit.fechaInicio).getTime();
        if (oldT !== inicioDate.getTime()) {
          recordatorio7dEnviado = false;
          recordatorio1dEnviado = false;
        }
      } else {
        recordatorio7dEnviado = false;
        recordatorio1dEnviado = false;
      }

      const normalizedValues = {
        ...rest,
        ...snapshot,
        estadoId: estadosTourCatalog.find((item) => item.nombre === values.estado)?.id,
        guiaId: values.guiaIds[0] ?? values.guiaId ?? "",
        guiaIds: values.guiaIds,
        cupoMaximo: Number(values.cupoMaximo),
        cupoMinimo: Number(values.cupoMinimo),
        precioVenta: Number(values.precioVenta),
        fechaInicio: inicioDate,
        fechaFin: finDate,
        transporteId: values.transporteId || undefined,
        costoTransporte: Number(values.costoTransporte ?? 0),
        costosExtras: Number(values.costosExtras ?? 0),
        recordatoriosAutomaticosHabilitados: values.recordatoriosAutomaticosHabilitados !== false,
        recordatorio7dEnviado,
        recordatorio1dEnviado,
      };
      if (selectedTourToEdit) {
        await toursService.update(selectedTourToEdit.id, normalizedValues);
        setSuccessMessage("Tour actualizado exitosamente.");
      } else {
        await toursService.create({
          ...normalizedValues,
          creadoPor: profile?.id ?? "sistema",
          recordatorio1dEnviado: false,
          recordatorio7dEnviado: false,
        });
        setSuccessMessage("Tour registrado exitosamente.");
      }
      closeTourModal();
      await reloadTours();
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    }
  });

  const handleDeleteTour = async () => {
    if (!tourToDelete || !isAdmin) {
      return;
    }

    try {
      setErrorMessage(null);
      await toursService.update(tourToDelete.id, { estado: "cancelado" });
      setTourToDelete(null);
      setSuccessMessage("Tour eliminado del listado operativo.");
      await reloadTours();
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    }
  };

  const selectedTour = tours.find((tour) => tour.id === selectedTourId);
  const inscripcionesActivas = inscripciones.filter((i) => i.estado !== "cancelado").length;
  const cuposDisponibles = selectedTour ? Math.max(0, selectedTour.cupoMaximo - inscripcionesActivas) : 0;

  const handleInscribir = async () => {
    await createInscripcion({
      selectedVagoId,
      montoTotal: inscripcionMontoTotal,
      userId: profile?.id ?? "sistema",
    });
  };

  const handleRegistrarPago = async (payload: { comprobante?: File | null }) => {
    let comprobanteUrl: string | undefined;
    if (payload.comprobante && selectedTourId) {
      const path = `comprobantes/${selectedTourId}/${Date.now()}_${payload.comprobante.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      comprobanteUrl = await uploadAdminFile(path, payload.comprobante);
    }
    const paymentCreated = await createPago({
      inscripcionId: paymentInscripcionId,
      monto: paymentAmount,
      metodoPago:
        metodosPagoCatalog.find((item) => item.id === paymentMethodId)?.nombre ||
        metodosPagoCatalog[0]?.nombre ||
        "transferencia",
      metodoPagoId: paymentMethodId || undefined,
      registradoPor: profile?.id ?? "sistema",
      comprobanteUrl,
    });
    if (paymentCreated) {
      setPaymentAmount(0);
    }
  };

  const handleExportVagosPdf = async () => {
    if (!selectedTourId || !isAdmin) {
      return;
    }
    try {
      setIsExportingPdf(true);
      setErrorMessage(null);
      const config = await configuracionService.get();
      const reportData = await buildTourVagosReport(selectedTourId);
      const comprasTourPdf = await comprasService.listByTour(selectedTourId);
      const pdf = await generateTourVagosPdf(reportData, {
        logoUrl: config.logoUrl,
        includePurchaseSummary: true,
        comprasTour: comprasTourPdf,
      });
      const safeName = reportData.tourName.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_");
      const fecha = reportData.scheduledDateTime.replace(/[^\d]/g, "").slice(0, 8);
      pdf.save(`${safeName}_${fecha}_Listado.pdf`);
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDriveFolderCreated = async (url: string) => {
    if (!selectedTourId) {
      return;
    }
    await toursService.update(selectedTourId, { driveFolderUrl: url });
    await reloadTours();
  };

  const transporteOptions = useMemo(() => {
    const selectedId = transporteIdWatch;
    const list = transporteDisponibles.some((t) => t.id === selectedId)
      ? transporteDisponibles
      : selectedId
        ? [...transporteDisponibles, ...unidadesTransporte.filter((u) => u.id === selectedId)]
        : transporteDisponibles;
    return list.filter((u, i, arr) => arr.findIndex((x) => x.id === u.id) === i);
  }, [transporteDisponibles, transporteIdWatch, unidadesTransporte]);

  return (
    <>
      <PageHeader
        title="Tours"
        description="Listado, operaciones, inscripciones y pagos. Compras y detalle financiero están en los módulos Compras y Reportes."
      />
      {errorMessage ? <p className="mb-4 rounded-md bg-danger/10 p-3 text-sm text-danger">{errorMessage}</p> : null}
      {successMessage ? <p className="mb-4 rounded-md bg-success/10 p-3 text-sm text-success">{successMessage}</p> : null}
      <TourListPanel
        tours={tours}
        hasMore={hasMoreTours}
        isAdmin={isAdmin}
        isLoadingMore={isLoadingMoreTours}
        onAddTour={openCreateTourModal}
        onDuplicateTour={openDuplicateFromTour}
        onSelectTour={setSelectedTourId}
        onEditTour={openEditTourModal}
        onDeleteTour={setTourToDelete}
        onLoadMore={() => void loadMoreTours()}
      />
      {selectedTourId && canVerFinanzasEnReportes ? (
        <p className="mt-3 text-sm text-textDark">
          <Link className="text-primary underline hover:no-underline" to={`/reportes?tour=${selectedTourId}`}>
            Ver detalle y finanzas de esta ocurrencia en Reportes
          </Link>
        </p>
      ) : null}
      {selectedTourId && isAdmin ? (
        <div className="mt-4">
          <TourOperacionesPanel
            driveFolderUrl={selectedTour?.driveFolderUrl}
            tourId={selectedTourId}
            onDriveFolderCreated={(url) => void handleDriveFolderCreated(url)}
            onReloadTour={reloadTours}
          />
        </div>
      ) : null}
      {selectedTourId ? (
        <div className="mt-4 flex justify-end">
          {isAdmin ? (
            <Button
              className="inline-flex items-center gap-2"
              variant="secondary"
              onClick={() => void handleExportVagosPdf()}
              disabled={isExportingPdf}
            >
              <FileDown size={16} strokeWidth={1.8} />
              {isExportingPdf ? "Exportando PDF..." : "Exportar listado PDF"}
            </Button>
          ) : null}
        </div>
      ) : null}
      {selectedTourId ? (
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <InscripcionesPanel
            cuposDisponibles={cuposDisponibles}
            inscripcionMontoTotal={inscripcionMontoTotal}
            isReadOnly={!isAdmin}
            isSubmitting={isSubmittingInscripcion}
            selectedVagoId={selectedVagoId}
            vagos={vagos}
            onAmountChange={setInscripcionMontoTotal}
            onSelectVago={setSelectedVagoId}
            onSubmit={() => void handleInscribir()}
          />
          <PagosPanel
            inscripciones={inscripciones}
            isReadOnly={!isAdmin}
            isSubmitting={isSubmittingPago}
            paymentAmount={paymentAmount}
            paymentInscripcionId={paymentInscripcionId}
            paymentMethodId={paymentMethodId}
            paymentMethods={metodosPagoCatalog}
            pagos={pagos}
            onAmountChange={setPaymentAmount}
            onSelectInscripcion={setPaymentInscripcionId}
            onSelectMethod={setPaymentMethodId}
            onSubmit={(payload) => void handleRegistrarPago(payload)}
          />
        </div>
      ) : null}
      <Modal
        isOpen={isTourModalOpen}
        onClose={closeTourModal}
        size="lg"
        title={selectedTourToEdit ? "Editar tour" : "Agregar tour"}
      >
        <form className="space-y-3" onSubmit={(event) => void onTourSubmit(event)}>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span>Plantilla</span>
              <select className="rounded-md border border-border px-3 py-2" {...form.register("plantillaId")}>
                <option value="">Selecciona una plantilla</option>
                {plantillas.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                  </option>
                ))}
              </select>
              {form.formState.errors.plantillaId?.message ? (
                <span className="text-danger">{form.formState.errors.plantillaId.message}</span>
              ) : null}
            </label>
            <Input label="Nombre del tour" {...form.register("nombre")} error={form.formState.errors.nombre?.message} />
            <label className="flex flex-col gap-1 text-sm">
              <span>Guías</span>
              <select
                className="rounded-md border border-border px-3 py-2"
                multiple
                value={selectedGuideIds}
                onChange={(event) => {
                  const ids = readSelectedValues(event.target.options);
                  form.setValue("guiaIds", ids, { shouldDirty: true, shouldValidate: true });
                  form.setValue("guiaId", ids[0] ?? "", { shouldDirty: true, shouldValidate: true });
                }}
              >
                {guias.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre} {item.apellido}
                  </option>
                ))}
              </select>
              <input type="hidden" {...form.register("guiaId")} />
              {form.formState.errors.guiaIds?.message ? (
                <span className="text-danger">{form.formState.errors.guiaIds.message}</span>
              ) : null}
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>Transporte</span>
              <select className="rounded-md border border-border px-3 py-2" {...form.register("transporteId")}>
                <option value="">Sin asignar</option>
                {transporteOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.placa} — {item.empresa} (cap. {item.capacidad})
                  </option>
                ))}
              </select>
              {capacidadAdvertencia ? <span className="text-amber-700">{capacidadAdvertencia}</span> : null}
              {form.formState.errors.transporteId?.message ? (
                <span className="text-danger">{form.formState.errors.transporteId.message}</span>
              ) : null}
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>Estado</span>
              <select className="rounded-md border border-border px-3 py-2" {...form.register("estado")}>
                <option value="">Selecciona estado</option>
                {estadosTourCatalog.map((item) => (
                  <option key={item.id} value={item.nombre}>
                    {item.nombre}
                  </option>
                ))}
              </select>
            </label>
            <Input label="Punto de encuentro" {...form.register("puntoEncuentro")} error={form.formState.errors.puntoEncuentro?.message} />
            <Input
              label="Fecha y hora de inicio"
              type="datetime-local"
              {...form.register("fechaInicio")}
              error={form.formState.errors.fechaInicio?.message}
            />
            <Input
              label="Fecha y hora de fin"
              type="datetime-local"
              {...form.register("fechaFin")}
              error={form.formState.errors.fechaFin?.message}
            />
            <Input
              label="Cupo máximo"
              type="number"
              {...form.register("cupoMaximo", { valueAsNumber: true })}
              error={form.formState.errors.cupoMaximo?.message}
            />
            <Input
              label="Cupo mínimo"
              type="number"
              {...form.register("cupoMinimo", { valueAsNumber: true })}
              error={form.formState.errors.cupoMinimo?.message}
            />
            <Input
              label="Precio de venta"
              type="number"
              {...form.register("precioVenta", { valueAsNumber: true })}
              error={form.formState.errors.precioVenta?.message}
            />
            <Input
              label="Costo transporte (USD)"
              type="number"
              {...form.register("costoTransporte", { valueAsNumber: true })}
              error={form.formState.errors.costoTransporte?.message}
            />
            <Input
              label="Otros costos extras (USD)"
              type="number"
              {...form.register("costosExtras", { valueAsNumber: true })}
              error={form.formState.errors.costosExtras?.message}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...form.register("recordatoriosAutomaticosHabilitados")} />
            Habilitar recordatorios automáticos (7 y 1 día antes)
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={closeTourModal}>
              Cancelar
            </Button>
            <Button disabled={form.formState.isSubmitting} type="submit">
              {form.formState.isSubmitting ? "Guardando..." : selectedTourToEdit ? "Actualizar tour" : "Guardar tour"}
            </Button>
          </div>
        </form>
      </Modal>
      <Modal isOpen={Boolean(tourToDelete)} onClose={() => setTourToDelete(null)} size="sm" title="Eliminar tour">
        <p className="text-sm text-textDark">
          Se marcará como cancelado el tour {tourToDelete?.nombre}. Sus inscripciones, pagos y compras se conservarán.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setTourToDelete(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={() => void handleDeleteTour()}>
            Eliminar
          </Button>
        </div>
      </Modal>
    </>
  );
}
