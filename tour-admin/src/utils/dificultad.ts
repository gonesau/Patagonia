import type { TourDificultad } from "@/types/tour.types";

const DEFAULT_FACTOR_TERRENO = 1.0;
const PESO_DESNIVEL_POR_100M = 1.5;
const UMBRAL_ALTITUD_INTERMEDIA_MSNM = 2500;
const UMBRAL_ALTITUD_ALTA_MSNM = 3500;
const BONO_ALTITUD_INTERMEDIA = 5;
const BONO_ALTITUD_ALTA = 10;

/**
 * Tabla de respaldo con los factores estandarizados del documento de negocio.
 * Se utiliza solo cuando Firestore aún no tiene seedeada la colección `terrenos`
 * (por ejemplo, durante el primer arranque o en pruebas unitarias offline).
 */
export const FACTORES_TERRENO_FALLBACK: Record<string, number> = {
  pavimentado: 1.0,
  tierra_compacta: 1.1,
  bosque_raices: 1.2,
  piedra_suelta: 1.3,
  lodo_arcilla: 1.4,
  ceniza_volcanica: 1.5,
  roca_trepada: 1.5,
};

export interface DatosClasificacion {
  distanciaKm?: number;
  elevacionM?: number;
  alturaMaximaMsnm?: number;
  terrenos?: string[];
}

export interface ResultadoClasificacion {
  puntaje: number;
  dificultad: TourDificultad;
  factorTerrenoMax: number;
  bonoAltitud: number;
}

function toNonNegativeNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0;
  }
  return value;
}

function calcularPuntajeBase(distanciaKm: number, elevacionM: number): number {
  return distanciaKm + (elevacionM / 100) * PESO_DESNIVEL_POR_100M;
}

function obtenerFactorTerrenoMax(
  terrenoIds: string[],
  factoresPorId: Record<string, number>,
): number {
  if (!terrenoIds || terrenoIds.length === 0) {
    return DEFAULT_FACTOR_TERRENO;
  }
  const factores = terrenoIds
    .map((id) => factoresPorId[id])
    .filter((factor): factor is number => typeof factor === "number" && Number.isFinite(factor) && factor > 0);
  if (factores.length === 0) {
    return DEFAULT_FACTOR_TERRENO;
  }
  return Math.max(...factores);
}

function calcularBonoAltitud(alturaMaximaMsnm: number): number {
  if (alturaMaximaMsnm > UMBRAL_ALTITUD_ALTA_MSNM) {
    return BONO_ALTITUD_ALTA;
  }
  if (alturaMaximaMsnm >= UMBRAL_ALTITUD_INTERMEDIA_MSNM) {
    return BONO_ALTITUD_INTERMEDIA;
  }
  return 0;
}

function mapearPuntajeADificultad(puntaje: number): TourDificultad {
  if (puntaje < 10) {
    return "muy_facil";
  }
  if (puntaje <= 20) {
    return "facil";
  }
  if (puntaje <= 35) {
    return "moderado";
  }
  if (puntaje <= 55) {
    return "dificil";
  }
  return "muy_dificil";
}

/**
 * Calcula el nivel de dificultad sugerido para una plantilla de tour basándose en la distancia,
 * desnivel acumulado, tipo de terreno más exigente y altitud máxima.
 *
 * @param datos Métricas físicas e identificadores de terrenos seleccionados.
 * @param factoresPorId Diccionario `{ idTerreno: factor }` proveniente del catálogo Firestore `terrenos`.
 *                     Si está vacío, se aplica el factor por defecto (1.0) sobre cualquier terreno.
 */
export function calcularDificultadSugerida(
  datos: DatosClasificacion,
  factoresPorId: Record<string, number> = {},
): ResultadoClasificacion {
  const distanciaKm = toNonNegativeNumber(datos.distanciaKm);
  const elevacionM = toNonNegativeNumber(datos.elevacionM);
  const alturaMaximaMsnm = toNonNegativeNumber(datos.alturaMaximaMsnm);
  const terrenoIds = Array.isArray(datos.terrenos) ? datos.terrenos : [];

  const puntajeBase = calcularPuntajeBase(distanciaKm, elevacionM);
  const factorTerrenoMax = obtenerFactorTerrenoMax(terrenoIds, factoresPorId);
  const puntajeTerreno = puntajeBase * factorTerrenoMax;
  const bonoAltitud = calcularBonoAltitud(alturaMaximaMsnm);
  const puntaje = Math.round((puntajeTerreno + bonoAltitud) * 100) / 100;

  return {
    puntaje,
    dificultad: mapearPuntajeADificultad(puntaje),
    factorTerrenoMax,
    bonoAltitud,
  };
}

const DIFICULTAD_LABELS: Record<TourDificultad, string> = {
  muy_facil: "Principiante",
  facil: "Fácil",
  moderado: "Moderado",
  dificil: "Difícil",
  muy_dificil: "Extremo",
};

export function obtenerEtiquetaDificultad(dificultad: TourDificultad): string {
  return DIFICULTAD_LABELS[dificultad];
}
