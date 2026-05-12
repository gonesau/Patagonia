import { guiasService } from "@/services/guiasService";
import { inscripcionesService } from "@/services/inscripcionesService";
import { pagosService } from "@/services/pagosService";
import { toursService } from "@/services/toursService";
import { transporteService } from "@/services/transporteService";
import { formatPhone } from "@/utils/inputMasks";
import { ServiceError } from "@/services/serviceErrors";
import type { TourVagosPdfData } from "@/utils/pdf.utils";

function toDateTime(value: Date): string {
  return new Intl.DateTimeFormat("es-SV", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(value);
}

const currencyUsd = new Intl.NumberFormat("es-SV", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatCurrencyUsd(value: number): string {
  return currencyUsd.format(value);
}

export async function buildTourVagosReport(tourId: string): Promise<TourVagosPdfData> {
  const [tours, allGuides, allTransports, inscripciones, pagos] = await Promise.all([
    toursService.list(),
    guiasService.list(),
    transporteService.list(),
    inscripcionesService.listByTour(tourId),
    pagosService.listByTour(tourId),
  ]);

  const selectedTour = tours.find((tour) => tour.id === tourId);
  if (!selectedTour) {
    throw new ServiceError("No se encontró el tour seleccionado para generar el PDF.");
  }

  const selectedGuideIds =
    selectedTour.guiaIds && selectedTour.guiaIds.length > 0
      ? selectedTour.guiaIds
      : selectedTour.guiaId
        ? [selectedTour.guiaId]
        : [];
  const guideNames = selectedGuideIds
    .map((guideId) => allGuides.find((guide) => guide.id === guideId))
    .filter((guide): guide is (typeof allGuides)[number] => Boolean(guide))
    .map((guide) => `${guide.nombre} ${guide.apellido}`);

  const transport = allTransports.find((item) => item.id === selectedTour.transporteId);
  const paymentsByInscription = pagos.reduce<Record<string, typeof pagos>>((accumulator, payment) => {
    if (!accumulator[payment.inscripcionId]) {
      accumulator[payment.inscripcionId] = [];
    }
    accumulator[payment.inscripcionId].push(payment);
    return accumulator;
  }, {});

  let pagadoCompleto = 0;
  let parcial = 0;
  let sinPagar = 0;
  let recaudado = 0;
  let pendiente = 0;

  const rows = inscripciones
    .filter((i) => i.estado !== "cancelado")
    .map((inscripcion) => {
      const inscriptionPayments = (paymentsByInscription[inscripcion.id] ?? []).sort(
        (first, second) => new Date(first.fecha).getTime() - new Date(second.fecha).getTime(),
      );
      const saldo = Math.max(inscripcion.montoTotal - inscripcion.montoPagado, 0);
      recaudado += inscripcion.montoPagado;
      pendiente += saldo;
      if (inscripcion.estadoPago === "completo") {
        pagadoCompleto += 1;
      } else if (inscripcion.estadoPago === "parcial") {
        parcial += 1;
      } else {
        sinPagar += 1;
      }
      const paymentMethods = Array.from(new Set(inscriptionPayments.map((item) => item.metodoPago).filter(Boolean)));

      return {
        fullName: saldo > 0.01 ? `* ${inscripcion.vagoNombre}` : inscripcion.vagoNombre,
        contact: `${inscripcion.vagoEmail} / ${formatPhone(inscripcion.vagoTelefono)}`,
        advance: formatCurrencyUsd(inscripcion.montoPagado),
        complement: formatCurrencyUsd(saldo),
        paymentMethods: paymentMethods.length > 0 ? paymentMethods.join(", ") : "Sin pagos",
      };
    });

  return {
    tourName: selectedTour.nombre,
    scheduledDateTime: toDateTime(new Date(selectedTour.fechaInicio)),
    guidesLabel: guideNames.length > 0 ? guideNames.join(", ") : "Guía no asignado",
    rows,
    footer: {
      totalVagos: rows.length,
      pagadoCompleto,
      parcial,
      sinPagar,
      recaudado,
      pendiente,
    },
    transportDetails: transport
      ? [
          `Empresa: ${transport.empresa}`,
          `Motorista: ${transport.motorista}`,
          `Vehículo: ${transport.marca} ${transport.modelo} (${transport.placa})`,
          `Capacidad: ${transport.capacidad} personas`,
        ]
      : ["No hay transporte asignado para este tour."],
  };
}
