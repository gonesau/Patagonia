import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Table } from "@/components/ui/Table";
import { TableActions } from "@/components/ui/TableActions";
import { useAuth } from "@/hooks/useAuth";
import { toursService } from "@/services/toursService";
import { plantillasService } from "@/services/plantillasService";
import { guiasService } from "@/services/guiasService";
import { vagosService } from "@/services/vagosService";
import { inscripcionesService } from "@/services/inscripcionesService";
import { pagosService } from "@/services/pagosService";
import { comprasService } from "@/services/comprasService";
import { calculateTourMargin } from "@/utils/financiero.utils";
import { tourFormSchema, type TourFormValues } from "@/utils/validaciones";
import type { TourOcurrencia, TourPlantilla } from "@/types/tour.types";
import type { Guia } from "@/types/guia.types";
import type { Vago } from "@/types/vago.types";
import type { Inscripcion } from "@/types/inscripcion.types";
import type { Pago } from "@/types/pago.types";
import type { Compra } from "@/types/compra.types";
import { toServiceErrorMessage } from "@/services/serviceErrors";
import { CircleDollarSign, ClipboardList, HandCoins, ReceiptText, UserPlus } from "lucide-react";

const defaultValues: TourFormValues = {
  plantillaId: "",
  nombre: "",
  estado: "borrador",
  guiaId: "",
  cupoMaximo: 20,
  cupoMinimo: 8,
  precioVenta: 25,
  puntoEncuentro: "",
};

export function ToursPage() {
  const { profile } = useAuth();
  const [tours, setTours] = useState<TourOcurrencia[]>([]);
  const [plantillas, setPlantillas] = useState<TourPlantilla[]>([]);
  const [guias, setGuias] = useState<Guia[]>([]);
  const [vagos, setVagos] = useState<Vago[]>([]);
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [selectedTourId, setSelectedTourId] = useState<string>("");
  const [selectedVagoId, setSelectedVagoId] = useState<string>("");
  const [inscripcionMontoTotal, setInscripcionMontoTotal] = useState<number>(0);
  const [paymentInscripcionId, setPaymentInscripcionId] = useState<string>("");
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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

  const loadCatalogs = async () => {
    const [plantillasData, guiasData, vagosData] = await Promise.all([
      plantillasService.list(),
      guiasService.list(),
      vagosService.list(),
    ]);
    setPlantillas(plantillasData.filter((item) => item.activa));
    setGuias(guiasData.filter((item) => item.estado === "activo"));
    setVagos(vagosData.filter((item) => item.activo));
  };

  const loadTours = async () => {
    const items = await toursService.list(profile?.rol === "guia" ? profile.guiaId : undefined);
    setTours(items);
    if (!selectedTourId && items[0]) {
      setSelectedTourId(items[0].id);
    }
  };

  const loadDetailData = async (tourId: string) => {
    const [inscripcionesData, pagosData, comprasData] = await Promise.all([
      inscripcionesService.listByTour(tourId),
      pagosService.listByTour(tourId),
      comprasService.listByTour(tourId),
    ]);
    setInscripciones(inscripcionesData);
    setPagos(pagosData);
    setCompras(comprasData);
    if (!paymentInscripcionId && inscripcionesData[0]) {
      setPaymentInscripcionId(inscripcionesData[0].id);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        setErrorMessage(null);
        await loadCatalogs();
        await loadTours();
      } catch (error) {
        setErrorMessage(toServiceErrorMessage(error));
      }
    };
    void initialize();
  }, []);

  useEffect(() => {
    if (!selectedTourId) {
      return;
    }
    void loadDetailData(selectedTourId);
  }, [selectedTourId]);

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
      const normalizedValues = {
        ...values,
        cupoMaximo: Number(values.cupoMaximo),
        cupoMinimo: Number(values.cupoMinimo),
        precioVenta: Number(values.precioVenta),
      };
      if (selectedTourToEdit) {
        await toursService.update(selectedTourToEdit.id, normalizedValues);
        setSuccessMessage("Tour actualizado exitosamente.");
      } else {
        const today = new Date();
        await toursService.create({
          ...normalizedValues,
          fechaInicio: today,
          fechaFin: today,
          creadoPor: profile?.id ?? "sistema",
          recordatorio1dEnviado: false,
          recordatorio7dEnviado: false,
        });
        setSuccessMessage("Tour registrado exitosamente.");
      }
      closeTourModal();
      await loadTours();
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
      await loadTours();
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    }
  };

  const selectedTour = tours.find((tour) => tour.id === selectedTourId);
  const ingresosRecibidos = inscripciones.reduce((total, item) => total + item.montoPagado, 0);
  const costoCompras = compras.reduce((total, item) => total + item.monto, 0);
  const financial = calculateTourMargin(
    ingresosRecibidos,
    selectedTour?.costoTransporte ?? 0,
    costoCompras,
    selectedTour?.costosExtras ?? 0,
  );

  const paymentRows = useMemo(
    () =>
      pagos.map((pago) => [
        pago.inscripcionId,
        `$${pago.monto.toFixed(2)}`,
        pago.metodoPago,
        new Date(pago.fecha).toLocaleDateString("es-SV"),
      ]),
    [pagos],
  );

  const handleInscribir = async () => {
    if (!selectedTourId || !selectedVagoId || inscripcionMontoTotal <= 0) {
      return;
    }
    const selectedVago = vagos.find((item) => item.id === selectedVagoId);
    if (!selectedVago) {
      return;
    }
    try {
      await inscripcionesService.createForTour(
        selectedTourId,
        selectedVago,
        inscripcionMontoTotal,
        profile?.id ?? "sistema",
      );
      await loadDetailData(selectedTourId);
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    }
  };

  const handleRegistrarPago = async () => {
    if (!selectedTourId || !paymentInscripcionId || paymentAmount <= 0) {
      return;
    }
    const inscripcion = inscripciones.find((item) => item.id === paymentInscripcionId);
    if (!inscripcion) {
      return;
    }
    await pagosService.create({
      inscripcionId: inscripcion.id,
      tourId: selectedTourId,
      vagoId: inscripcion.vagoId,
      monto: paymentAmount,
      metodoPago: "transferencia",
      fecha: new Date(),
    });
    setPaymentAmount(0);
    await loadDetailData(selectedTourId);
  };

  const handleRegistrarCompra = async () => {
    if (!selectedTourId) {
      return;
    }
    await comprasService.create(selectedTourId, {
      categoria: "logistica",
      descripcion: "Compra registrada manualmente",
      monto: 1,
      fecha: new Date(),
    });
    await loadDetailData(selectedTourId);
  };

  return (
    <>
      <PageHeader title="Tours" description="Gestión integral de tours, inscripciones, pagos y margen." />
      {errorMessage ? <p className="mb-4 rounded-md bg-danger/10 p-3 text-sm text-danger">{errorMessage}</p> : null}
      {successMessage ? <p className="mb-4 rounded-md bg-success/10 p-3 text-sm text-success">{successMessage}</p> : null}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 font-heading text-xl">
              <ClipboardList size={18} strokeWidth={1.8} />
              Listado de tours
            </h3>
            <Button onClick={openCreateTourModal}>Agregar tour</Button>
          </div>
          <Table
            emptyMessage="No hay tours registrados."
            headers={["Tour", "Estado", "Cupo", "Precio", "Acciones"]}
            rows={tours.map((tour) => ({
              key: tour.id,
              cells: [
                <button
                  key={`select-${tour.id}`}
                  className="font-semibold text-[#0d6efd] underline-offset-2 hover:underline"
                  onClick={() => setSelectedTourId(tour.id)}
                  type="button"
                >
                  {tour.nombre}
                </button>,
                tour.estado,
                `${tour.cupoMinimo}-${tour.cupoMaximo}`,
                `$${tour.precioVenta.toFixed(2)}`,
                <TableActions
                  key={`actions-${tour.id}`}
                  onDelete={() => setTourToDelete(tour)}
                  onEdit={() => {
                    setSelectedTourId(tour.id);
                    openEditTourModal(tour);
                  }}
                />,
              ],
            }))}
          />
        </Card>
        <Card>
          <h3 className="mb-3 flex items-center gap-2 font-heading text-xl">
            <ClipboardList size={18} strokeWidth={1.8} />
            Resumen del tour seleccionado
          </h3>
          <p className="mb-3 text-sm text-neutral">
            {selectedTour ? selectedTour.nombre : "Selecciona un tour desde el listado para ver sus indicadores."}
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            <Card>
              <p className="inline-flex items-center gap-1 text-xs text-neutral">
                <HandCoins size={14} strokeWidth={1.8} />
                Ingresos recibidos
              </p>
              <p className="font-mono text-lg">${ingresosRecibidos.toFixed(2)}</p>
            </Card>
            <Card>
              <p className="inline-flex items-center gap-1 text-xs text-neutral">
                <ReceiptText size={14} strokeWidth={1.8} />
                Costo total
              </p>
              <p className="font-mono text-lg">${financial.costoTotal.toFixed(2)}</p>
            </Card>
            <Card>
              <p className="inline-flex items-center gap-1 text-xs text-neutral">
                <CircleDollarSign size={14} strokeWidth={1.8} />
                Margen
              </p>
              <p className={`font-mono text-lg ${financial.margenGanancia >= 0 ? "text-success" : "text-danger"}`}>
                ${financial.margenGanancia.toFixed(2)}
              </p>
            </Card>
          </div>
        </Card>
      </div>
      {selectedTourId ? (
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <Card>
            <h3 className="mb-2 flex items-center gap-2 font-heading text-lg">
              <UserPlus size={17} strokeWidth={1.8} />
              Inscribir Vago
            </h3>
            <label className="mb-2 flex flex-col gap-1 text-sm">
              <span>Vago</span>
              <select
                className="rounded-md border border-border px-3 py-2"
                value={selectedVagoId}
                onChange={(event) => setSelectedVagoId(event.target.value)}
              >
                <option value="">Selecciona</option>
                {vagos.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre} {item.apellido}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label="Monto acordado"
              type="number"
              value={inscripcionMontoTotal}
              onChange={(event) => setInscripcionMontoTotal(Number(event.target.value))}
            />
            <Button className="mt-2 w-full" onClick={() => void handleInscribir()}>
              Inscribir
            </Button>
          </Card>
          <Card>
            <h3 className="mb-2 font-heading text-lg">Registrar pago</h3>
            <label className="mb-2 flex flex-col gap-1 text-sm">
              <span>Inscripción</span>
              <select
                className="rounded-md border border-border px-3 py-2"
                value={paymentInscripcionId}
                onChange={(event) => setPaymentInscripcionId(event.target.value)}
              >
                <option value="">Selecciona</option>
                {inscripciones.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.vagoNombre}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label="Monto"
              type="number"
              value={paymentAmount}
              onChange={(event) => setPaymentAmount(Number(event.target.value))}
            />
            <Button className="mt-2 w-full" onClick={() => void handleRegistrarPago()}>
              Registrar pago
            </Button>
          </Card>
          <Card>
            <h3 className="mb-2 font-heading text-lg">Compras</h3>
            <Button className="w-full" onClick={() => void handleRegistrarCompra()}>
              Registrar compra de prueba
            </Button>
            <p className="mt-2 text-sm text-neutral">Compras registradas: {compras.length}</p>
          </Card>
          <div className="xl:col-span-3">
            <Card>
              <h3 className="mb-3 font-heading text-lg">Estado de pagos</h3>
              <Table
                headers={["Vago", "Total", "Pagado", "Estado"]}
                rows={inscripciones.map((item) => [
                  item.vagoNombre,
                  `$${item.montoTotal.toFixed(2)}`,
                  `$${item.montoPagado.toFixed(2)}`,
                  item.estadoPago,
                ])}
              />
              <div className="mt-4">
                <h4 className="mb-2 font-heading">Historial de pagos</h4>
                <Table headers={["Inscripción", "Monto", "Método", "Fecha"]} rows={paymentRows} />
              </div>
            </Card>
          </div>
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
                <option value="borrador">Borrador</option>
                <option value="publicado">Publicado</option>
                <option value="lleno">Lleno</option>
                <option value="en_curso">En curso</option>
                <option value="realizado">Realizado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </label>
            <Input label="Punto de encuentro" {...form.register("puntoEncuentro")} error={form.formState.errors.puntoEncuentro?.message} />
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
