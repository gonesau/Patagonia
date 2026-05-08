import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/hooks/useAuth";
import { toursService } from "@/services/toursService";
import { calculateTourMargin } from "@/utils/financiero.utils";
import { tourFormSchema, type TourFormValues } from "@/utils/validaciones";
import { toServiceErrorMessage } from "@/services/serviceErrors";
import type { TourOcurrencia } from "@/types/tour.types";
import { TourListPanel } from "./components/TourListPanel";
import { TourDetailPanel } from "./components/TourDetailPanel";
import { InscripcionesPanel } from "./components/InscripcionesPanel";
import { PagosPanel } from "./components/PagosPanel";
import { ComprasPanel } from "./components/ComprasPanel";
import { useToursPageState } from "./hooks/useToursPageState";

const defaultValues: TourFormValues = {
  plantillaId: "",
  nombre: "",
  estado: "borrador",
  guiaId: "",
  fechaInicio: "",
  fechaFin: "",
  cupoMaximo: 20,
  cupoMinimo: 8,
  precioVenta: 25,
  puntoEncuentro: "",
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

export function ToursPage() {
  const { profile } = useAuth();
  const {
    tours,
    plantillas,
    guias,
    vagos,
    inscripciones,
    pagos,
    comprasTour,
    comprasGenerales,
    categoriasCompra,
    estadosTourCatalog,
    metodosPagoCatalog,
    selectedTourId,
    paymentInscripcionId,
    errorMessage,
    hasMoreTours,
    isLoadingMoreTours,
    isSubmittingInscripcion,
    isSubmittingPago,
    isSubmittingCompra,
    setSelectedTourId,
    setPaymentInscripcionId,
    setErrorMessage,
    reloadTours,
    loadMoreTours,
    createInscripcion,
    createPago,
    createCompra,
    updateCompra,
    deleteCompra,
  } = useToursPageState(profile);

  const [selectedVagoId, setSelectedVagoId] = useState<string>("");
  const [inscripcionMontoTotal, setInscripcionMontoTotal] = useState<number>(0);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethodId, setPaymentMethodId] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedTourToEdit, setSelectedTourToEdit] = useState<TourOcurrencia | null>(null);
  const [tourToDelete, setTourToDelete] = useState<TourOcurrencia | null>(null);
  const [isTourModalOpen, setIsTourModalOpen] = useState<boolean>(false);

  const form = useForm<TourFormValues>({
    resolver: zodResolver(tourFormSchema),
    defaultValues,
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const openCreateTourModal = () => {
    setSelectedTourToEdit(null);
    setSuccessMessage(null);
    form.reset(defaultValues);
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
      fechaInicio: toLocalDateTimeString(tour.fechaInicio),
      fechaFin: toLocalDateTimeString(tour.fechaFin),
      cupoMaximo: tour.cupoMaximo,
      cupoMinimo: tour.cupoMinimo,
      precioVenta: tour.precioVenta,
      puntoEncuentro: tour.puntoEncuentro,
    });
    setIsTourModalOpen(true);
  };

  const closeTourModal = () => {
    setIsTourModalOpen(false);
    setSelectedTourToEdit(null);
    form.reset(defaultValues);
  };

  const onTourSubmit = form.handleSubmit(async (values) => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);
      const { fechaInicio, fechaFin, ...rest } = values;
      const normalizedValues = {
        ...rest,
        estadoId: estadosTourCatalog.find((item) => item.nombre === values.estado)?.id,
        cupoMaximo: Number(values.cupoMaximo),
        cupoMinimo: Number(values.cupoMinimo),
        precioVenta: Number(values.precioVenta),
        fechaInicio: new Date(fechaInicio),
        fechaFin: new Date(fechaFin),
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
    if (!tourToDelete) {
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
  const ingresosRecibidos = inscripciones.reduce((total, item) => total + item.montoPagado, 0);
  const costoCompras = comprasTour.reduce((total, item) => total + item.monto, 0);
  const financial = calculateTourMargin(
    ingresosRecibidos,
    selectedTour?.costoTransporte ?? 0,
    costoCompras,
    selectedTour?.costosExtras ?? 0,
  );

  const handleInscribir = async () => {
    await createInscripcion({
      selectedVagoId,
      montoTotal: inscripcionMontoTotal,
      userId: profile?.id ?? "sistema",
    });
  };

  const handleRegistrarPago = async () => {
    const paymentCreated = await createPago({
      inscripcionId: paymentInscripcionId,
      monto: paymentAmount,
      metodoPago:
        metodosPagoCatalog.find((item) => item.id === paymentMethodId)?.nombre ||
        metodosPagoCatalog[0]?.nombre ||
        "transferencia",
      metodoPagoId: paymentMethodId || undefined,
    });
    if (paymentCreated) {
      setPaymentAmount(0);
    }
  };

  return (
    <>
      <PageHeader title="Tours" description="Gestión integral de tours, inscripciones, pagos y margen." />
      {errorMessage ? <p className="mb-4 rounded-md bg-danger/10 p-3 text-sm text-danger">{errorMessage}</p> : null}
      {successMessage ? <p className="mb-4 rounded-md bg-success/10 p-3 text-sm text-success">{successMessage}</p> : null}
      <div className="grid gap-4 xl:grid-cols-2">
        <TourListPanel
          tours={tours}
          hasMore={hasMoreTours}
          isLoadingMore={isLoadingMoreTours}
          onAddTour={openCreateTourModal}
          onSelectTour={setSelectedTourId}
          onEditTour={openEditTourModal}
          onDeleteTour={setTourToDelete}
          onLoadMore={() => void loadMoreTours()}
        />
        <TourDetailPanel
          selectedTour={selectedTour}
          ingresosRecibidos={ingresosRecibidos}
          costoTotal={financial.costoTotal}
          margenGanancia={financial.margenGanancia}
        />
      </div>
      {selectedTourId ? (
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <InscripcionesPanel
            vagos={vagos}
            selectedVagoId={selectedVagoId}
            inscripcionMontoTotal={inscripcionMontoTotal}
            isSubmitting={isSubmittingInscripcion}
            onSelectVago={setSelectedVagoId}
            onAmountChange={setInscripcionMontoTotal}
            onSubmit={() => void handleInscribir()}
          />
          <PagosPanel
            inscripciones={inscripciones}
            pagos={pagos}
            paymentInscripcionId={paymentInscripcionId}
            paymentAmount={paymentAmount}
            paymentMethodId={paymentMethodId}
            paymentMethods={metodosPagoCatalog}
            isSubmitting={isSubmittingPago}
            onSelectInscripcion={setPaymentInscripcionId}
            onAmountChange={setPaymentAmount}
            onSelectMethod={setPaymentMethodId}
            onSubmit={() => void handleRegistrarPago()}
          />
          <ComprasPanel
            tourId={selectedTourId}
            comprasTour={comprasTour}
            comprasGenerales={comprasGenerales}
            categorias={categoriasCompra}
            isSubmitting={isSubmittingCompra}
            onCreate={createCompra}
            onUpdate={updateCompra}
            onDelete={deleteCompra}
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
              <span>Guía</span>
              <select className="rounded-md border border-border px-3 py-2" {...form.register("guiaId")}>
                <option value="">Selecciona un guía</option>
                {guias.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre} {item.apellido}
                  </option>
                ))}
              </select>
              {form.formState.errors.guiaId?.message ? (
                <span className="text-danger">{form.formState.errors.guiaId.message}</span>
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
          </div>
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
