/**
 * Estados operativos de un tour (no administrables; solo lectura calculada o bandera de cancelación).
 *
 * - `programado`: Tour creado; aún no ha iniciado (antes de `fechaInicio`).
 * - `en_curso`: En el momento de la consulta el tour está en su ventana (`fechaInicio` … `fechaFin`).
 * - `realizado`: Ya pasó la fecha de fin del tour (cierre según calendario; no implica otro resultado de negocio).
 * - `cancelado`: Marcado explícitamente con `cancelado: true` en el documento.
 *
 * El valor se calcula en lectura en `toursService` salvo cancelación manual.
 */
export type EstadoTourId = "programado" | "en_curso" | "realizado" | "cancelado";

export interface EstadoTour {
  id: EstadoTourId;
  nombre: string;
  /** Clase de color Tailwind para usar en badges u otros elementos de UI. */
  color: string;
}

export const ESTADOS_TOUR: EstadoTour[] = [
  { id: "programado", nombre: "Programado", color: "bg-blue-100 text-blue-800" },
  { id: "en_curso", nombre: "En curso", color: "bg-emerald-100 text-emerald-800" },
  { id: "realizado", nombre: "Realizado", color: "bg-slate-100 text-slate-600" },
  { id: "cancelado", nombre: "Cancelado", color: "bg-red-100 text-red-700" },
];

export function getEstadoTour(id: EstadoTourId | string): EstadoTour {
  return ESTADOS_TOUR.find((e) => e.id === id) ?? ESTADOS_TOUR[0];
}
