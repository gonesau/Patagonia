import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { MultiSelectChips, type MultiSelectOption } from "@/components/ui/MultiSelectChips";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { toursService } from "@/services/toursService";
import { softDeleteService } from "@/services/softDeleteService";
import { transporteService } from "@/services/transporteService";
import { uploadAdminFile } from "@/services/storageUploadService";
import { comprasService } from "@/services/comprasService";
import { tourFormSchema, type TourFormValues } from "@/utils/validaciones";
import { toServiceErrorMessage } from "@/services/serviceErrors";
import { AlertMessage } from "@/components/ui/AlertMessage";
import { findGuiaIdsWithTourConflict, plantillaSnapshotForTour } from "@/utils/tourScheduling.utils";
import {
  OPCIONES_CATEGORIA_TOUR,
  groupToursByCategoria,
  resolveTourCategoria,
} from "@/utils/tourCategoria";
import type { TourOcurrencia } from "@/types/tour.types";
import { getEstadoTour } from "@/types/estadoTour.types";
import type { Transporte } from "@/types/transporte.types";
import { TourListPanel } from "./components/TourListPanel";
import { TourOperacionesPanel } from "./components/TourOperacionesPanel";
import { InscribirVagoModal, type InscripcionPanelSubmitPayload } from "./components/InscribirVagoModal";
import { VagosInscritosPanel } from "./components/VagosInscritosPanel";
import { HistorialPagosPanel } from "./components/HistorialPagosPanel";
import {
  RegistrarPagoModal,
  type RegistrarPagoModalSubmitPayload,
} from "./components/RegistrarPagoModal";
import { useToursPageState } from "./hooks/useToursPageState";
import type { Inscripcion } from "@/types/inscripcion.types";
import { buildTourVagosReport } from "@/utils/tourReportBuilder";
import { generateTourVagosPdf } from "@/utils/pdf.utils";
import { configuracionService } from "@/services/configuracionService";

const defaultValues: TourFormValues = {
  plantillaId: "",
  nombre: "",
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

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export function ToursPage() {
  const { profile } = useAuth();
  const { canViewFinancial } = usePermissions();
  const isAdmin = profile?.rol === "admin";
  const canVerFinanzasEnReportes = canViewFinancial;
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    tours,
    plantillas,
    guias,
    inscripciones,
    pagos,
    metodosPagoCatalog,
    selectedTourId,
    errorMessage,
    hasMoreTours,
    isLoadingMoreTours,
    isSubmittingInscripcion,
    isSubmittingPago,
    setSelectedTourId,
    setErrorMessage,
    reloadTours,
    loadMoreTours,
    createInscripcionConPagoInicial,
    createPago,
    cancelInscripcion,
    loadDetailData,
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

  const [filtroCategoria, setFiltroCategoria] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedTourToEdit, setSelectedTourToEdit] = useState<TourOcurrencia | null>(null);
  const [tourToDelete, setTourToDelete] = useState<TourOcurrencia | null>(null);
  const [tourDetail, setTourDetail] = useState<TourOcurrencia | null>(null);
  const [isTourModalOpen, setIsTourModalOpen] = useState<boolean>(false);
  const [isInscribirVagoModalOpen, setIsInscribirVagoModalOpen] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [unidadesTransporte, setUnidadesTransporte] = useState<Transporte[]>([]);
  const [transporteDisponibles, setTransporteDisponibles] = useState<Transporte[]>([]);
  const [capacidadAdvertencia, setCapacidadAdvertencia] = useState<string | null>(null);
  const [pagoInscripcionTarget, setPagoInscripcionTarget] = useState<Inscripcion | null>(null);

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
      const now = new Date();
      const requiereTransporte =
        selectedTourToEdit?.cancelado !== true && !Number.isNaN(finDate.getTime()) && finDate >= now;
      if (requiereTransporte && (!values.transporteId || values.transporteId.trim().length === 0)) {
        form.setError("transporteId", {
          type: "manual",
          message: "Debes asignar transporte para ocurrencias vigentes o futuras.",
        });
        return;
      }
      const conflictIds = await findGuiaIdsWithTourConflict(inicioDate, finDate, values.guiaIds, selectedTourToEdit?.id);
      if (conflictIds.length > 0) {
        const conflictNames = conflictIds.map(id => guias.find(g => g.id === id)?.nombre || "Un guía").join(", ");
        form.setError("guiaIds", {
          type: "manual",
          message: `Conflicto de horario: ${conflictNames} ya tiene otro tour asignado en esa fecha y hora.`,
        });
        return;
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
      await softDeleteService.softDelete("tours", tourToDelete.id, {
        usuarioId: profile?.id ?? "sistema",
        usuarioEmail: profile?.email ?? "",
      });
      setTourToDelete(null);
      setSuccessMessage("Tour eliminado del listado operativo.");
      await reloadTours();
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    }
  };

  const handleCancelTour = async (tour: TourOcurrencia) => {
    if (!isAdmin) return;
    try {
      setErrorMessage(null);
      if (tour.cancelado) {
        await toursService.uncancelTour(tour.id);
        setSuccessMessage(`Tour "${tour.nombre}" reactivado. El estado se recalculará según fechas.`);
      } else {
        await toursService.cancelTour(tour.id);
        setSuccessMessage(`Tour "${tour.nombre}" cancelado exitosamente.`);
      }
      await reloadTours();
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    }
  };

  const selectedTour = tours.find((tour) => tour.id === selectedTourId);
  const inscripcionesActivas = inscripciones.filter((i) => i.estado !== "cancelado").length;
  const cuposDisponibles = selectedTour ? Math.max(0, selectedTour.cupoMaximo - inscripcionesActivas) : 0;

  const uploadComprobanteIfNeeded = async (
    comprobante: File | null,
  ): Promise<string | undefined> => {
    if (!comprobante || !selectedTourId) {
      return undefined;
    }
    const safeFileName = comprobante.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `comprobantes/${selectedTourId}/${Date.now()}_${safeFileName}`;
    return uploadAdminFile(path, comprobante);
  };

  const handleInscribirVago = async (
    payload: InscripcionPanelSubmitPayload,
  ): Promise<boolean> => {
    try {
      let comprobanteUrl: string | undefined;
      if (payload.pagoInicial?.comprobante) {
        comprobanteUrl = await uploadComprobanteIfNeeded(payload.pagoInicial.comprobante);
      }
      const success = await createInscripcionConPagoInicial({
        vago: payload.vago,
        montoTotal: payload.montoTotal,
        userId: profile?.id ?? "sistema",
        pagoInicial: payload.pagoInicial
          ? {
              monto: payload.pagoInicial.monto,
              metodoPagoId: payload.pagoInicial.metodoPagoId,
              metodoPagoNombre: payload.pagoInicial.metodoPagoNombre,
              comprobanteUrl,
            }
          : undefined,
      });
      if (success) {
        setSuccessMessage("Vago inscrito exitosamente.");
      }
      return success;
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
      return false;
    }
  };

  const handleRegistrarPagoModalSubmit = async (
    payload: RegistrarPagoModalSubmitPayload,
  ): Promise<boolean> => {
    try {
      const comprobanteUrl = await uploadComprobanteIfNeeded(payload.comprobante);
      const success = await createPago({
        inscripcionId: payload.inscripcionId,
        monto: payload.monto,
        metodoPagoId: payload.metodoPagoId,
        metodoPagoNombre: payload.metodoPagoNombre,
        comprobanteUrl,
        registradoPor: profile?.id ?? "sistema",
        notas: payload.notas,
      });
      if (success) {
        setSuccessMessage("Pago registrado exitosamente.");
      }
      return success;
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
      return false;
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
      console.error("[ToursPage] Error al exportar PDF de vagos:", error);
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

  const guiaOptions = useMemo<MultiSelectOption[]>(
    () =>
      guias
        .filter((item) => {
          if (selectedGuideIds.includes(item.id)) return true;
          const estado = (item.estado || "").toLowerCase();
          return !estado.includes("vacaciones") && !estado.includes("inactivo");
        })
        .map((item) => ({
          id: item.id,
          label: `${item.nombre} ${item.apellido}`,
          sublabel: item.email,
        })),
    [guias, selectedGuideIds],
  );

  const plantillaById = useMemo(
    () => new Map(plantillas.map((plantilla) => [plantilla.id, plantilla])),
    [plantillas],
  );

  const filteredTours = useMemo(() => {
    if (!filtroCategoria) {
      return tours;
    }
    return tours.filter((tour) => resolveTourCategoria(tour, plantillaById) === filtroCategoria);
  }, [tours, filtroCategoria, plantillaById]);

  const groupedTours = useMemo(
    () => groupToursByCategoria(filteredTours, plantillaById),
    [filteredTours, plantillaById],
  );

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
      {errorMessage && !isTourModalOpen ? <AlertMessage type="error" message={errorMessage} className="mb-4" /> : null}
      {successMessage ? <AlertMessage type="success" message={successMessage} className="mb-4" /> : null}
      <div className="mb-4">
        <label className="flex max-w-xs flex-col gap-1 text-sm">
          <span>Filtrar por categoría</span>
          <select
            className="rounded-md border border-border px-3 py-2"
            value={filtroCategoria}
            onChange={(event) => setFiltroCategoria(event.target.value)}
          >
            <option value="">Todas</option>
            {OPCIONES_CATEGORIA_TOUR.map((opcion) => (
              <option key={opcion.clave} value={opcion.clave}>
                {opcion.etiqueta}
              </option>
            ))}
          </select>
        </label>
      </div>
      {/* ─── Listado ─── */}
      <TourListPanel
        groupedTours={groupedTours}
        hasMore={hasMoreTours}
        isAdmin={isAdmin}
        canViewFinancial={canViewFinancial}
        isLoadingMore={isLoadingMoreTours}
        onAddTour={openCreateTourModal}
        onDuplicateTour={openDuplicateFromTour}
        onSelectTour={setSelectedTourId}
        onEditTour={openEditTourModal}
        onDeleteTour={setTourToDelete}
        onViewTour={setTourDetail}
        onLoadMore={() => void loadMoreTours()}
      />

      {/* ─── Detalle del tour seleccionado ─── */}
      {selectedTourId ? (
        <div className="mt-6 space-y-4">
          {/* Barra de contexto del tour */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-5 py-3 shadow-soft">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
              <p className="truncate text-sm font-semibold text-textDark">
                Tour seleccionado:{" "}
                <span className="text-primary">{selectedTour?.nombre ?? selectedTourId}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {canVerFinanzasEnReportes ? (
                <Link
                  className="text-sm text-primary underline-offset-2 hover:underline"
                  to={`/reportes?tour=${selectedTourId}`}
                >
                  Ver finanzas en Reportes →
                </Link>
              ) : null}
            </div>
          </div>

          {!isAdmin ? null : (
            <div className="flex justify-start">
              <Button onClick={() => setIsInscribirVagoModalOpen(true)} className="inline-flex items-center gap-2">
                Inscribir Vago
              </Button>
            </div>
          )}

          {/* Vagos Inscritos (Listado y acciones masivas) */}
          <VagosInscritosPanel
            tourId={selectedTourId}
            inscripciones={inscripciones}
            isReadOnly={!isAdmin}
            canViewFinancial={canViewFinancial}
            isExportingPdf={isExportingPdf}
            onRegistrarPago={(inscripcion) => setPagoInscripcionTarget(inscripcion)}
            onDesinscribir={async (inscripcionId) => { await cancelInscripcion(inscripcionId); }}
            onExportarPdf={handleExportVagosPdf}
            onReloadTour={async () => {
              await reloadTours();
              await loadDetailData(selectedTourId);
            }}
          />

          {/* Historial y Operaciones */}
          <div className="grid gap-4 xl:grid-cols-2">
            {canViewFinancial ? (
              <HistorialPagosPanel
                pagos={pagos}
                inscripciones={inscripciones}
              />
            ) : null}
            {isAdmin ? (
              <TourOperacionesPanel
                driveFolderUrl={selectedTour?.driveFolderUrl}
                tourId={selectedTourId}
                onDriveFolderCreated={(url) => void handleDriveFolderCreated(url)}
                onReloadTour={async () => {
                  await reloadTours();
                  await loadDetailData(selectedTourId);
                }}
              />
            ) : null}
          </div>
        </div>
      ) : (
        <p className="mt-6 rounded-lg border border-dashed border-border bg-surface px-5 py-6 text-center text-sm text-neutral">
          Seleccioná un tour de la lista para ver sus detalles, inscripciones y pagos.
        </p>
      )}

      <InscribirVagoModal
        isOpen={isInscribirVagoModalOpen}
        onClose={() => setIsInscribirVagoModalOpen(false)}
        cuposDisponibles={cuposDisponibles}
        isReadOnly={!isAdmin}
        isSubmitting={isSubmittingInscripcion}
        onSubmit={handleInscribirVago}
        paymentMethods={metodosPagoCatalog}
      />
      <Modal
        isOpen={isTourModalOpen}
        onClose={closeTourModal}
        size="lg"
        fullScreenOnMobile
        title={selectedTourToEdit ? "Editar tour" : "Agregar tour"}
      >
        <form className="space-y-3" onSubmit={(event) => void onTourSubmit(event)}>
          {errorMessage && isTourModalOpen ? (
            <AlertMessage type="error" message={errorMessage} />
          ) : null}
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
            <div>
              <MultiSelectChips
                emptyMessage="Sin guías que coincidan con la búsqueda."
                error={form.formState.errors.guiaIds?.message}
                label="Guías"
                onChange={(ids) => {
                  form.setValue("guiaIds", ids, { shouldDirty: true, shouldValidate: true });
                  form.setValue("guiaId", ids[0] ?? "", { shouldDirty: true, shouldValidate: true });
                }}
                options={guiaOptions}
                placeholder="Buscar por nombre o apellido..."
                value={selectedGuideIds}
              />
              <input type="hidden" {...form.register("guiaId")} />
            </div>
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
              {selectedTourToEdit ? (
                <div className="flex flex-col gap-3 rounded-md border border-border bg-slate-50 px-3 py-2 sm:flex-row sm:items-center">
                  <span className="flex-1 text-sm text-textDark">
                    El estado no se edita aquí: es Programado (aún no inicia), En curso (entre inicio y fin), Realizado
                    (ya pasó la fecha de fin) o Cancelado (marcado manualmente).{" "}
                    {selectedTourToEdit.cancelado
                      ? "Este tour está cancelado."
                      : `Estado actual: ${getEstadoTour(selectedTourToEdit.estado).nombre}.`}
                  </span>
                  <Button
                    type="button"
                    variant={selectedTourToEdit.cancelado ? "ghost" : "danger"}
                    onClick={() => void handleCancelTour(selectedTourToEdit)}
                  >
                    {selectedTourToEdit.cancelado ? "Revertir cancelación" : "Cancelar tour"}
                  </Button>
                </div>
              ) : (
                <p className="rounded-md border border-border bg-slate-50 px-3 py-2 text-sm text-neutral">
                  Al guardar, el estado será Programado, En curso o Realizado según la fecha y hora actuales
                  respecto al inicio y fin del tour. Cancelado solo si cancelás el tour después.
                </p>
              )}
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
      <RegistrarPagoModal
        inscripcion={pagoInscripcionTarget}
        isOpen={Boolean(pagoInscripcionTarget)}
        isSubmitting={isSubmittingPago}
        onClose={() => setPagoInscripcionTarget(null)}
        onSubmit={handleRegistrarPagoModalSubmit}
        paymentMethods={metodosPagoCatalog}
      />
      <Modal isOpen={Boolean(tourDetail)} onClose={() => setTourDetail(null)} size="md" title="Detalles del tour">
        {tourDetail ? (
          <div className="grid gap-y-4 gap-x-6 sm:grid-cols-2 text-sm text-textDark max-h-[70vh] overflow-y-auto pr-2">
            <div className="sm:col-span-2">
              <p className="font-semibold text-neutral">Nombre</p>
              <p>{tourDetail.nombre}</p>
            </div>
            <div>
              <p className="font-semibold text-neutral">Estado</p>
              <p>{getEstadoTour(tourDetail.estado).nombre}</p>
            </div>
            {canViewFinancial ? (
              <div>
                <p className="font-semibold text-neutral">Precio de venta</p>
                <p>${tourDetail.precioVenta.toFixed(2)}</p>
              </div>
            ) : null}
            <div>
              <p className="font-semibold text-neutral">Fecha de inicio</p>
              <p>{new Date(tourDetail.fechaInicio).toLocaleString("es-SV")}</p>
            </div>
            <div>
              <p className="font-semibold text-neutral">Fecha de fin</p>
              <p>{new Date(tourDetail.fechaFin).toLocaleString("es-SV")}</p>
            </div>
            <div>
              <p className="font-semibold text-neutral">Cupo Mín / Máx</p>
              <p>{tourDetail.cupoMinimo} / {tourDetail.cupoMaximo}</p>
            </div>
            <div>
              <p className="font-semibold text-neutral">Punto de encuentro</p>
              <p>{tourDetail.puntoEncuentro || "—"}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="font-semibold text-neutral">Plantilla Base</p>
              <p>{plantillas.find(p => p.id === tourDetail.plantillaId)?.nombre || tourDetail.plantillaId}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="font-semibold text-neutral">Guías Asignados</p>
              <p>
                {tourDetail.guiaIds && tourDetail.guiaIds.length > 0 
                  ? tourDetail.guiaIds.map(gid => guias.find(g => g.id === gid)?.nombre || gid).join(", ")
                  : tourDetail.guiaId ? (guias.find(g => g.id === tourDetail.guiaId)?.nombre || tourDetail.guiaId) : "—"}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="font-semibold text-neutral">Transporte Asignado</p>
              <p>{tourDetail.transporteId ? (unidadesTransporte.find(u => u.id === tourDetail.transporteId)?.placa || tourDetail.transporteId) : "—"}</p>
            </div>
            {canViewFinancial ? (
              <>
                <div>
                  <p className="font-semibold text-neutral">Costo Transporte</p>
                  <p>${tourDetail.costoTransporte?.toFixed(2) || "0.00"}</p>
                </div>
                <div>
                  <p className="font-semibold text-neutral">Costos Extras</p>
                  <p>${tourDetail.costosExtras?.toFixed(2) || "0.00"}</p>
                </div>
              </>
            ) : null}
            <div className="sm:col-span-2">
              <p className="font-semibold text-neutral">Recordatorios Automáticos</p>
              <p>{tourDetail.recordatoriosAutomaticosHabilitados !== false ? "Habilitados" : "Deshabilitados"}</p>
            </div>
          </div>
        ) : null}
        <div className="mt-6 flex justify-end">
          <Button variant="ghost" onClick={() => setTourDetail(null)}>Cerrar</Button>
        </div>
      </Modal>
    </>
  );
}
