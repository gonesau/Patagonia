import type { TourCategoria } from "@/types/tour.types";

export const tourCategoriaValues = [
  "cascada",
  "volcanes",
  "cerros",
  "ciudad",
  "otras_actividades",
] as const;

export type TourCategoriaValue = (typeof tourCategoriaValues)[number];

export const OPCIONES_CATEGORIA_TOUR: readonly { clave: TourCategoria; etiqueta: string }[] = [
  { clave: "cascada", etiqueta: "Cascada" },
  { clave: "volcanes", etiqueta: "Volcanes" },
  { clave: "cerros", etiqueta: "Cerros" },
  { clave: "ciudad", etiqueta: "Ciudad" },
  { clave: "otras_actividades", etiqueta: "Otras actividades" },
];

const CATEGORIA_LABELS: Record<TourCategoria, string> = {
  cascada: "Cascada",
  volcanes: "Volcanes",
  cerros: "Cerros",
  ciudad: "Ciudad",
  otras_actividades: "Otras actividades",
};

export function obtenerEtiquetaCategoria(categoria: TourCategoria): string {
  return CATEGORIA_LABELS[categoria];
}

export function isTourCategoriaValue(value: string): value is TourCategoria {
  return (tourCategoriaValues as readonly string[]).includes(value);
}

export const SIN_CATEGORIA_KEY = "__sin_categoria__";

export interface TourCategoriaGroup<T> {
  key: string;
  label: string;
  items: T[];
}

export function resolveTourCategoria(
  tour: { categoria?: TourCategoria; plantillaId: string },
  plantillaById: Map<string, { categoria?: TourCategoria | "" }>,
): TourCategoria | null {
  if (tour.categoria && isTourCategoriaValue(tour.categoria)) {
    return tour.categoria;
  }
  const plantilla = plantillaById.get(tour.plantillaId);
  const fromPlantilla = plantilla?.categoria;
  if (fromPlantilla && isTourCategoriaValue(fromPlantilla)) {
    return fromPlantilla;
  }
  return null;
}

export function groupToursByCategoria<T extends { categoria?: TourCategoria; plantillaId: string }>(
  tours: T[],
  plantillaById: Map<string, { categoria?: TourCategoria | "" }>,
): TourCategoriaGroup<T>[] {
  const buckets = new Map<string, T[]>();

  for (const tour of tours) {
    const categoria = resolveTourCategoria(tour, plantillaById);
    const key = categoria ?? SIN_CATEGORIA_KEY;
    const current = buckets.get(key) ?? [];
    current.push(tour);
    buckets.set(key, current);
  }

  const orderedKeys: string[] = [
    ...tourCategoriaValues,
    ...(buckets.has(SIN_CATEGORIA_KEY) ? [SIN_CATEGORIA_KEY] : []),
  ];

  return orderedKeys
    .filter((key) => buckets.has(key))
    .map((key) => ({
      key,
      label: key === SIN_CATEGORIA_KEY ? "Sin categoría" : obtenerEtiquetaCategoria(key as TourCategoria),
      items: buckets.get(key) ?? [],
    }));
}
