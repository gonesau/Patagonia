import { FirebaseError } from "firebase/app";
import { collection, getCountFromServer, getDocs, orderBy, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { toursService } from "./toursService";
import { pagosService } from "./pagosService";
import { guiasService } from "./guiasService";
import { guiaDocumentosService } from "./guiaDocumentosService";
import { inscripcionesService } from "./inscripcionesService";
import type { UserRole } from "@/types/usuario.types";
import type { TourOcurrencia } from "@/types/tour.types";

export interface DashboardAuthProfile {
  rol: UserRole;
  guiaId?: string;
}

export interface DashboardUpcomingTourRow {
  id: string;
  nombre: string;
  fechaInicio: Date;
  estado: string;
  cupoMaximo: number;
  inscritosActivos: number;
}

export type DashboardAlertLevel = "critico" | "preventivo";

export interface DashboardAlert {
  id: string;
  nivel: DashboardAlertLevel;
  titulo: string;
  detalle: string;
}

/** Serie mensual para gráficos de línea / área / barra */
export interface MonthlySeries {
  mes: string; // "Ene", "Feb", …
  valor: number;
}

/** Serie mensual con dos valores para gráficos agrupados */
export interface MonthlyDoubleSeries {
  mes: string;
  ingresos: number;
  gastos: number;
}

/** Serie mensual con dos valores para tours realizados vs cancelados */
export interface MonthlyTourStatusSeries {
  mes: string;
  realizados: number;
  cancelados: number;
}

/** Distribución simple para gráficos de donut / barra */
export interface DistributionItem {
  nombre: string;
  valor: number;
}

/** Tasa de ocupación por tour */
export interface OcupacionItem {
  nombre: string;
  porcentaje: number;
}

/** Carga de trabajo por guía */
export interface GuiaCargaItem {
  nombre: string;
  tours: number;
}

export interface DashboardChartData {
  /** Métrica 1: Ingresos mensuales (área) */
  ingresosMensuales: MonthlySeries[];
  /** Métrica 2: Distribución de tours por estado (donut) */
  toursPorEstado: DistributionItem[];
  /** Métrica 3: Tasa de ocupación por tour próximo (barras h.) */
  ocupacionTours: OcupacionItem[];
  /** Métrica 4: Estado de pagos de inscripciones (donut) */
  estadosPago: DistributionItem[];
  /** Métrica 5: Tours por dificultad (barras v.) */
  toursPorDificultad: DistributionItem[];
  /** Métrica 6: Ingresos vs Gastos por mes (barras agrupadas) */
  ingresosVsGastos: MonthlyDoubleSeries[];
  /** Métrica 7: Nuevos vagos por mes (línea) — null si sin acceso */
  nuevosVagosMensuales: MonthlySeries[] | null;
  /** Métrica 8: Tours por guía (barras h.) — null si sin acceso */
  toursPorGuia: GuiaCargaItem[] | null;
  /** Métrica 9: Método de pago más usado (donut) */
  metodosPago: DistributionItem[];
  /** Métrica 10: Tours realizados vs cancelados por mes (barras apiladas) */
  toursEstadoPorMes: MonthlyTourStatusSeries[];
}

export interface DashboardMetrics {
  toursProximos30Dias: number;
  vagosActivos: number | null;
  ingresosMes: number;
  toursAnioRealizados: number;
  hasRestrictedMetrics: boolean;
  upcomingTours: DashboardUpcomingTourRow[];
  alerts: DashboardAlert[];
  charts: DashboardChartData;
}

// ─── Helpers de fecha ────────────────────────────────────────────────────────

function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/** Devuelve los últimos N meses incluyendo el actual, ordenados ascendentemente. */
function lastNMonths(n: number): Array<{ year: number; month: number; label: string }> {
  const now = new Date();
  const result: Array<{ year: number; month: number; label: string }> = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({ year: d.getFullYear(), month: d.getMonth(), label: MONTH_LABELS[d.getMonth()] });
  }
  return result;
}

/** Rango [inicio, fin] según el filtro de período seleccionado */
export type PeriodFilter = "30d" | "3m" | "6m" | "year";

export function periodToDateRange(filter: PeriodFilter): { start: Date; end: Date; months: number } {
  const now = new Date();
  const end = endOfMonth(now);
  if (filter === "30d") {
    return { start: addDays(now, -30), end, months: 1 };
  }
  if (filter === "3m") {
    return { start: new Date(now.getFullYear(), now.getMonth() - 2, 1), end, months: 3 };
  }
  if (filter === "6m") {
    return { start: new Date(now.getFullYear(), now.getMonth() - 5, 1), end, months: 6 };
  }
  // year
  return { start: new Date(now.getFullYear(), 0, 1), end, months: 12 };
}

// ─── Helpers de acceso seguro ─────────────────────────────────────────────────

async function getActiveVagosCountSafe(): Promise<{ count: number | null; restricted: boolean }> {
  try {
    const vagosCount = await getCountFromServer(query(collection(db, "vagos"), where("activo", "==", true)));
    return { count: vagosCount.data().count, restricted: false };
  } catch (error) {
    if (error instanceof FirebaseError && error.code === "permission-denied") {
      return { count: null, restricted: true };
    }
    throw error;
  }
}

async function collectDocumentAlerts(guiaIds: string[]): Promise<DashboardAlert[]> {
  const alerts: DashboardAlert[] = [];
  const now = new Date();
  const limitDate = addDays(now, 30);
  for (const guiaId of guiaIds) {
    let documentos;
    try {
      documentos = await guiaDocumentosService.list(guiaId);
    } catch {
      continue;
    }
    for (const docItem of documentos) {
      const vence = docItem.venceEn ? new Date(docItem.venceEn) : null;
      if (!vence || Number.isNaN(vence.getTime())) {
        continue;
      }
      const id = `guia-doc-${guiaId}-${docItem.id}`;
      if (vence < now) {
        alerts.push({
          id,
          nivel: "critico",
          titulo: "Documento de guía vencido",
          detalle: `Guía ${guiaId}: ${docItem.nombre} venció el ${vence.toLocaleDateString("es-SV")}.`,
        });
      } else if (vence <= limitDate) {
        alerts.push({
          id,
          nivel: "preventivo",
          titulo: "Documento de guía por vencer",
          detalle: `Guía ${guiaId}: ${docItem.nombre} vence el ${vence.toLocaleDateString("es-SV")}.`,
        });
      }
    }
  }
  return alerts;
}

// ─── Chart data builders ──────────────────────────────────────────────────────

function buildToursPorEstado(tours: TourOcurrencia[]): DistributionItem[] {
  const map: Record<string, number> = { programado: 0, en_curso: 0, realizado: 0, cancelado: 0 };
  for (const t of tours) map[t.estado] = (map[t.estado] ?? 0) + 1;
  return [
    { nombre: "Programado", valor: map.programado },
    { nombre: "En curso", valor: map.en_curso },
    { nombre: "Realizado", valor: map.realizado },
    { nombre: "Cancelado", valor: map.cancelado },
  ].filter((d) => d.valor > 0);
}

function buildToursPorDificultad(tours: TourOcurrencia[]): DistributionItem[] {
  const map: Record<string, number> = { facil: 0, moderado: 0, dificil: 0, extremo: 0 };
  for (const t of tours) {
    const d = t.dificultad ?? "moderado";
    map[d] = (map[d] ?? 0) + 1;
  }
  return [
    { nombre: "Fácil", valor: map.facil },
    { nombre: "Moderado", valor: map.moderado },
    { nombre: "Difícil", valor: map.dificil },
    { nombre: "Extremo", valor: map.extremo },
  ].filter((d) => d.valor > 0);
}

function buildToursEstadoPorMes(tours: TourOcurrencia[], months: number): MonthlyTourStatusSeries[] {
  const buckets = lastNMonths(months);
  const result: MonthlyTourStatusSeries[] = buckets.map((b) => ({ mes: b.label, realizados: 0, cancelados: 0 }));

  for (const tour of tours) {
    const d = new Date(tour.fechaInicio);
    const idx = buckets.findIndex((b) => b.year === d.getFullYear() && b.month === d.getMonth());
    if (idx === -1) continue;
    if (tour.estado === "realizado") result[idx].realizados++;
    else if (tour.estado === "cancelado") result[idx].cancelados++;
  }
  return result;
}

function buildIngresosVsGastos(
  tours: TourOcurrencia[],
  pagosMap: Map<string, number>,
  months: number,
): MonthlyDoubleSeries[] {
  const buckets = lastNMonths(months);
  const result: MonthlyDoubleSeries[] = buckets.map((b) => ({ mes: b.label, ingresos: 0, gastos: 0 }));

  for (const tour of tours) {
    const d = new Date(tour.fechaInicio);
    const idx = buckets.findIndex((b) => b.year === d.getFullYear() && b.month === d.getMonth());
    if (idx === -1) continue;
    result[idx].gastos += (tour.costoTransporte ?? 0) + (tour.costosExtras ?? 0);
  }

  for (const [tourId, monto] of pagosMap.entries()) {
    const tour = tours.find((t) => t.id === tourId);
    if (!tour) continue;
    const d = new Date(tour.fechaInicio);
    const idx = buckets.findIndex((b) => b.year === d.getFullYear() && b.month === d.getMonth());
    if (idx === -1) continue;
    result[idx].ingresos += monto;
  }

  return result;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function getDashboardMetrics(
  auth: DashboardAuthProfile,
  period: PeriodFilter = "year",
): Promise<DashboardMetrics> {
  const now = new Date();
  const plus30Days = addDays(now, 30);
  const startYear = new Date(now.getFullYear(), 0, 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const monthEnd = endOfMonth(now);
  const { start: periodStart, end: periodEnd, months: periodMonths } = periodToDateRange(period);

  const guiaFilter = auth?.rol === "guia" ? auth.guiaId : undefined;
  const isAdmin = auth?.rol === "admin";

  // ── Carga paralela base ───────────────────────────────────────────────────
  const [vagosCountResult, tours] = await Promise.all([
    getActiveVagosCountSafe(),
    toursService.list(guiaFilter, auth?.rol),
  ]);

  // Filtrar tours al período seleccionado para las métricas de gráficos
  const toursInPeriod = tours.filter((t) => {
    const d = new Date(t.fechaInicio);
    return d >= periodStart && d <= periodEnd;
  });

  const tourIdsInPeriod = toursInPeriod.map((t) => t.id);

  // ── Pagos ─────────────────────────────────────────────────────────────────
  // La información financiera (pagos) está reservada para administradores.
  const pagosDelPeriodo = isAdmin
    ? await pagosService.listBetweenFechas(periodStart, periodEnd).catch(() => [])
    : [];

  const ingresosMes = isAdmin
    ? pagosDelPeriodo
        .filter((p) => {
          const f = new Date(p.fecha);
          return f >= monthStart && f <= monthEnd;
        })
        .reduce((s, p) => s + p.monto, 0)
    : 0;

  // ── Alertas documentos ────────────────────────────────────────────────────
  const alertsDocs = await (async (): Promise<DashboardAlert[]> => {
    if (auth?.rol === "guia" && auth.guiaId) return collectDocumentAlerts([auth.guiaId]);
    if (isAdmin) {
      const guias = await guiasService.list();
      return collectDocumentAlerts(guias.map((g) => g.id));
    }
    return [];
  })();

  // ── Próximos tours ────────────────────────────────────────────────────────
  const upcomingTours = tours
    .filter((tour) => {
      const date = new Date(tour.fechaInicio);
      return date >= now && date <= plus30Days && tour.estado !== "cancelado";
    })
    .sort((a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime());

  const upcomingRows: DashboardUpcomingTourRow[] = await Promise.all(
    upcomingTours.map(async (tour) => ({
      id: tour.id,
      nombre: tour.nombre,
      fechaInicio: new Date(tour.fechaInicio),
      estado: tour.estado,
      cupoMaximo: tour.cupoMaximo,
      inscritosActivos: await inscripcionesService.countActivas(tour.id),
    })),
  );

  const toursAnioRealizados = tours.filter((tour) => {
    const date = new Date(tour.fechaInicio);
    return date >= startYear && tour.estado === "realizado";
  }).length;

  const alerts = [...alertsDocs].sort((a, b) => {
    if (a.nivel === b.nivel) return 0;
    return a.nivel === "critico" ? -1 : 1;
  });

  // ── Inscripciones (para métricas 3 y 4) ───────────────────────────────────
  // Solo para tours próximos (ocupación) — limitamos a 20 para no sobre-cargar
  const upcomingForOcupacion = upcomingTours.slice(0, 20);
  const ocupacionTours: OcupacionItem[] = await Promise.all(
    upcomingForOcupacion.map(async (t) => {
      const count = await inscripcionesService.countActivas(t.id);
      const pct = t.cupoMaximo > 0 ? Math.round((count / t.cupoMaximo) * 100) : 0;
      return { nombre: t.nombre.length > 22 ? t.nombre.slice(0, 22) + "…" : t.nombre, porcentaje: pct };
    }),
  );

  // Estado de pagos: agregamos sobre las inscripciones de tours en período.
  // Es información financiera, por lo que se reserva a administradores.
  const estadosPagoMap: Record<string, number> = { pendiente: 0, parcial: 0, completo: 0 };
  if (isAdmin && tourIdsInPeriod.length > 0) {
    const inscripcionesLists = await Promise.all(tourIdsInPeriod.slice(0, 30).map((id) => inscripcionesService.listByTour(id)));
    for (const list of inscripcionesLists) {
      for (const ins of list) {
        if (ins.estadoPago) estadosPagoMap[ins.estadoPago] = (estadosPagoMap[ins.estadoPago] ?? 0) + 1;
      }
    }
  }

  const estadosPago: DistributionItem[] = [
    { nombre: "Completo", valor: estadosPagoMap.completo },
    { nombre: "Parcial", valor: estadosPagoMap.parcial },
    { nombre: "Pendiente", valor: estadosPagoMap.pendiente },
  ].filter((d) => d.valor > 0);

  // ── Ingresos mensuales (Métrica 1) ────────────────────────────────────────
  const buckets = lastNMonths(periodMonths);
  const ingresosMensuales: MonthlySeries[] = buckets.map((b) => {
    const total = pagosDelPeriodo
      .filter((p) => {
        const d = new Date(p.fecha);
        return d.getFullYear() === b.year && d.getMonth() === b.month;
      })
      .reduce((s, p) => s + p.monto, 0);
    return { mes: b.label, valor: total };
  });

  // ── Ingresos vs Gastos (Métrica 6) ───────────────────────────────────────
  const pagosMapByTour = new Map<string, number>();
  for (const p of pagosDelPeriodo) {
    pagosMapByTour.set(p.tourId, (pagosMapByTour.get(p.tourId) ?? 0) + p.monto);
  }
  const ingresosVsGastos = buildIngresosVsGastos(toursInPeriod, pagosMapByTour, periodMonths);

  // ── Métodos de pago (Métrica 9) ───────────────────────────────────────────
  const metodosMap: Record<string, number> = {};
  for (const p of pagosDelPeriodo) {
    const m = p.metodoPago || "Sin especificar";
    metodosMap[m] = (metodosMap[m] ?? 0) + 1;
  }
  const metodosPago: DistributionItem[] = Object.entries(metodosMap)
    .map(([nombre, valor]) => ({ nombre, valor }))
    .sort((a, b) => b.valor - a.valor);

  // ── Nuevos vagos por mes (Métrica 7) — solo admin ─────────────────────────
  let nuevosVagosMensuales: MonthlySeries[] | null = null;
  if (isAdmin) {
    try {
      const vagosSnap = await getDocs(
        query(collection(db, "vagos"), where("activo", "==", true), orderBy("creadoEn", "desc")),
      );
      const vagosData = vagosSnap.docs.map((d) => {
        const raw = d.data() as Record<string, unknown>;
        const ts = raw.creadoEn as { toDate?: () => Date } | null;
        return ts?.toDate ? ts.toDate() : null;
      });
      nuevosVagosMensuales = buckets.map((b) => {
        const count = vagosData.filter((d) => d && d.getFullYear() === b.year && d.getMonth() === b.month).length;
        return { mes: b.label, valor: count };
      });
    } catch {
      nuevosVagosMensuales = null;
    }
  }

  // ── Tours por guía (Métrica 8) — solo admin ───────────────────────────────
  let toursPorGuia: GuiaCargaItem[] | null = null;
  if (isAdmin) {
    try {
      const guias = await guiasService.list();
      const guiaMap = new Map(guias.map((g) => [g.id, `${g.nombre} ${g.apellido}`]));
      const cargaMap: Record<string, number> = {};
      for (const t of toursInPeriod) {
        const ids = t.guiaIds && t.guiaIds.length > 0 ? t.guiaIds : t.guiaId ? [t.guiaId] : [];
        for (const gid of ids) {
          cargaMap[gid] = (cargaMap[gid] ?? 0) + 1;
        }
      }
      toursPorGuia = Object.entries(cargaMap)
        .map(([id, tours]) => ({ nombre: guiaMap.get(id) ?? id.slice(0, 8), tours }))
        .sort((a, b) => b.tours - a.tours)
        .slice(0, 10);
    } catch {
      toursPorGuia = null;
    }
  }

  return {
    toursProximos30Dias: upcomingTours.length,
    vagosActivos: vagosCountResult.count,
    ingresosMes,
    toursAnioRealizados,
    hasRestrictedMetrics: vagosCountResult.restricted || !isAdmin,
    upcomingTours: upcomingRows,
    alerts,
    charts: {
      ingresosMensuales,
      toursPorEstado: buildToursPorEstado(toursInPeriod),
      ocupacionTours,
      estadosPago,
      toursPorDificultad: buildToursPorDificultad(toursInPeriod),
      ingresosVsGastos,
      nuevosVagosMensuales,
      toursPorGuia,
      metodosPago,
      toursEstadoPorMes: buildToursEstadoPorMes(toursInPeriod, periodMonths),
    },
  };
}
