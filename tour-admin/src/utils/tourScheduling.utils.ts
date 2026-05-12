import { toursService } from "@/services/toursService";
import type { TourPlantilla } from "@/types/tour.types";

export async function findGuiaIdsWithTourConflict(
  fechaInicio: Date,
  fechaFin: Date,
  guiaIds: string[],
  excludeTourId: string | undefined,
): Promise<string[]> {
  if (guiaIds.length === 0) {
    return [];
  }
  const toursThatDay = await toursService.listOnLocalDate(fechaInicio);
  const conflictIds = new Set<string>();
  
  const newStart = fechaInicio.getTime();
  const newEnd = fechaFin.getTime();

  for (const tour of toursThatDay) {
    if (excludeTourId && tour.id === excludeTourId) {
      continue;
    }
    if (tour.estado === "cancelado") {
      continue;
    }
    
    const tourStart = new Date(tour.fechaInicio).getTime();
    const tourEnd = new Date(tour.fechaFin).getTime();
    
    const hasOverlap = newStart < tourEnd && newEnd > tourStart;

    if (hasOverlap) {
      const assigned = tour.guiaIds && tour.guiaIds.length > 0 ? tour.guiaIds : tour.guiaId ? [tour.guiaId] : [];
      for (const gid of guiaIds) {
        if (assigned.includes(gid)) {
          conflictIds.add(gid);
        }
      }
    }
  }
  return Array.from(conflictIds);
}

export function plantillaSnapshotForTour(plantilla: TourPlantilla | undefined): Record<string, unknown> {
  if (!plantilla) {
    return {};
  }
  return {
    distanciaKm: plantilla.distanciaKm,
    elevacionM: plantilla.elevacionM,
    dificultad: plantilla.dificultad,
    wikiloc: plantilla.wikiloc,
    equipoRecomendado: plantilla.equipoRecomendado,
    queLlevar: plantilla.queLlevar,
    itinerarioTipo: plantilla.itinerarioTipo,
    serviciosExtras: plantilla.serviciosExtras,
    politicaCancelacion: plantilla.politicaCancelacion,
  };
}
