import type { SoftDeleteFields } from "./softDelete.types";
import type { EstadoTourId } from "./estadoTour.types";

/** Cuatro niveles fijos de dificultad de plantilla (sin catálogo en Firestore). */
export type TourDificultad = "facil" | "moderado" | "dificil" | "extremo";

export interface TourPlantilla extends SoftDeleteFields {
  id: string;
  nombre: string;
  descripcion: string;
  distanciaKm?: number;
  elevacionM?: number;
  alturaMaximaMsnm?: number;
  terrenos?: string[];
  puntajeDificultad?: number;
  dificultadCalculada?: TourDificultad;
  /** Opcional; datos legacy. Debe coincidir con `dificultad` cuando se persiste desde la app. */
  dificultadId?: string;
  dificultad: TourDificultad | "";
  wikiloc?: string;
  equipoRecomendado?: string;
  queLlevar?: string;
  itinerarioTipo?: string;
  serviciosExtras?: string;
  politicaCancelacion?: string;
  tiempoEstimado?: string;
  precioBase: number;
  activa: boolean;
  creadoEn: Date;
  creadoPor: string;
}

export interface TourOcurrencia extends SoftDeleteFields {
  id: string;
  plantillaId: string;
  nombre: string;
  /** Derivado en lectura por `toursService` (fechas y `cancelado`). */
  estado: EstadoTourId;
  /** Bandera de cancelación manual. Cuando es `true`, el estado calculado es siempre `'cancelado'`. */
  cancelado?: boolean;
  activo?: boolean;
  guiaId: string;
  guiaIds?: string[];
  fechaInicio: Date;
  fechaFin: Date;
  transporteId?: string;
  cupoMaximo: number;
  cupoMinimo: number;
  precioVenta: number;
  puntoEncuentro: string;
  coordenadasEncuentro?: { lat: number; lng: number };
  /** Copiados desde plantilla al crear/editar; no modifican la plantilla maestra. */
  distanciaKm?: number;
  elevacionM?: number;
  dificultad?: string;
  wikiloc?: string;
  equipoRecomendado?: string;
  queLlevar?: string;
  itinerarioTipo?: string;
  serviciosExtras?: string;
  politicaCancelacion?: string;
  costoTransporte?: number;
  costosExtras?: number;
  driveFolderUrl?: string;
  driveFolderId?: string;
  recordatorio7dEnviado: boolean;
  recordatorio1dEnviado: boolean;
  /** Si false, el scheduler no envía recordatorios automáticos (7d/1d). */
  recordatoriosAutomaticosHabilitados?: boolean;
  creadoEn: Date;
  creadoPor: string;
  actualizadoEn: Date;
}
