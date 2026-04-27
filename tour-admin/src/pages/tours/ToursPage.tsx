import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
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

  const form = useForm<TourFormValues>({
    resolver: zodResolver(tourFormSchema),
    defaultValues,
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

  const onTourSubmit = form.handleSubmit(async (values) => {
    try {
      const today = new Date();
      await toursService.create({
        ...values,
        fechaInicio: today,
        fechaFin: today,
        creadoPor: profile?.id ?? "sistema",
        cupoMaximo: Number(values.cupoMaximo),
        cupoMinimo: Number(values.cupoMinimo),
        precioVenta: Number(values.precioVenta),
        recordatorio1dEnviado: false,
        recordatorio7dEnviado: false,
      });
      form.reset(defaultValues);
      await loadTours();
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    }
  });

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
      <PageHeader title="Ocurrencias de Tour" description="Gestión integral de tours, inscripciones, pagos y margen." />
      {errorMessage ? <p className="mb-4 rounded-md bg-danger/10 p-3 text-sm text-danger">{errorMessage}</p> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-heading text-xl">Crear ocurrencia</h3>
          <form className="space-y-3" onSubmit={(event) => void onTourSubmit(event)}>
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
            </label>
            <Input label="Nombre de ocurrencia" {...form.register("nombre")} error={form.formState.errors.nombre?.message} />
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
            </label>
            <Input label="Punto de encuentro" {...form.register("puntoEncuentro")} />
            <Input label="Cupo máximo" type="number" {...form.register("cupoMaximo", { valueAsNumber: true })} />
            <Input label="Cupo mínimo" type="number" {...form.register("cupoMinimo", { valueAsNumber: true })} />
            <Input label="Precio de venta" type="number" {...form.register("precioVenta", { valueAsNumber: true })} />
            <Button type="submit" className="w-full">
              Guardar ocurrencia
            </Button>
          </form>
        </Card>
        <Card>
          <h3 className="mb-3 font-heading text-xl">Ocurrencias</h3>
          <label className="mb-3 flex flex-col gap-1 text-sm">
            <span>Selecciona una ocurrencia</span>
            <select
              className="rounded-md border border-border px-3 py-2"
              value={selectedTourId}
              onChange={(event) => setSelectedTourId(event.target.value)}
            >
              <option value="">Selecciona</option>
              {tours.map((tour) => (
                <option key={tour.id} value={tour.id}>
                  {tour.nombre}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-2 md:grid-cols-3">
            <Card>
              <p className="text-xs text-neutral">Ingresos recibidos</p>
              <p className="font-mono text-lg">${ingresosRecibidos.toFixed(2)}</p>
            </Card>
            <Card>
              <p className="text-xs text-neutral">Costo total</p>
              <p className="font-mono text-lg">${financial.costoTotal.toFixed(2)}</p>
            </Card>
            <Card>
              <p className="text-xs text-neutral">Margen</p>
              <p className={`font-mono text-lg ${financial.margenGanancia >= 0 ? "text-success" : "text-danger"}`}>
                ${financial.margenGanancia.toFixed(2)}
              </p>
            </Card>
          </div>
        </Card>
      </div>
      {selectedTourId ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <Card>
            <h3 className="mb-2 font-heading text-lg">Inscribir Vago</h3>
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
          <div className="lg:col-span-3">
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
    </>
  );
}
