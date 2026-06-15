import type { Inscripcion } from "@/types/inscripcion.types";
import type { TourOcurrencia } from "@/types/tour.types";
import type { UserRole } from "@/types/usuario.types";

function canSeeFinancials(role: UserRole | null | undefined): boolean {
  return role === "admin";
}

export function stripTourFinancials(
  tour: TourOcurrencia,
  role: UserRole | null | undefined,
): TourOcurrencia {
  if (canSeeFinancials(role)) {
    return tour;
  }
  return { ...tour, precioVenta: 0, costoTransporte: 0, costosExtras: 0 };
}

export function stripInscripcionFinancials(
  inscripcion: Inscripcion,
  role: UserRole | null | undefined,
): Inscripcion {
  if (canSeeFinancials(role)) {
    return inscripcion;
  }
  return { ...inscripcion, montoTotal: 0, montoPagado: 0, estadoPago: "pendiente" };
}
