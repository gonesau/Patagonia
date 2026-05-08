import { FirebaseError } from "firebase/app";
import { collection, getCountFromServer, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { toursService } from "./toursService";
import { pagosService } from "./pagosService";
import { guiasService } from "./guiasService";
import { guiaDocumentosService } from "./guiaDocumentosService";
import { transporteService } from "./transporteService";
import { inscripcionesService } from "./inscripcionesService";
import type { UserRole } from "@/types/usuario.types";

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

export interface DashboardMetrics {
  toursProximos30Dias: number;
  vagosActivos: number | null;
  ingresosMes: number;
  toursAnioRealizados: number;
  hasRestrictedMetrics: boolean;
  upcomingTours: DashboardUpcomingTourRow[];
  alerts: DashboardAlert[];
}

function toDate(value: unknown): Date | null {
  if (value == null) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof (value as { toDate?: () => Date }).toDate === "function") {
    const parsed = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(value as string | number);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

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

async function computeMonthlyIncome(
  auth: DashboardAuthProfile | null,
  monthStart: Date,
  monthEnd: Date,
  tourIdsForGuia: string[],
): Promise<number> {
  if (auth && (auth.rol === "admin" || auth.rol === "operador")) {
    try {
      const pagos = await pagosService.listBetweenFechas(monthStart, monthEnd);
      return pagos.reduce((total, item) => total + item.monto, 0);
    } catch (error) {
      if (error instanceof FirebaseError && error.code === "permission-denied") {
        return computeMonthlyIncomeFromTours(tourIdsForGuia, monthStart, monthEnd);
      }
      throw error;
    }
  }
  return computeMonthlyIncomeFromTours(tourIdsForGuia, monthStart, monthEnd);
}

async function computeMonthlyIncomeFromTours(tourIds: string[], monthStart: Date, monthEnd: Date): Promise<number> {
  if (tourIds.length === 0) {
    return 0;
  }
  const pagosPorTour = await Promise.all(tourIds.map((tourId) => pagosService.listByTour(tourId)));
  return pagosPorTour
    .flat()
    .filter((pago) => {
      const fecha = new Date(pago.fecha);
      return fecha >= monthStart && fecha <= monthEnd;
    })
    .reduce((total, pago) => total + pago.monto, 0);
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

async function collectTransportAlerts(): Promise<DashboardAlert[]> {
  const alerts: DashboardAlert[] = [];
  const unidades = await transporteService.list();
  const now = new Date();
  const limitDate = addDays(now, 30);
  for (const unidad of unidades) {
    if (!unidad.activo) {
      continue;
    }
    const vence = toDate(unidad.seguroVence as unknown);
    if (!vence) {
      continue;
    }
    const id = `transporte-seguro-${unidad.id}`;
    if (vence < now) {
      alerts.push({
        id,
        nivel: "critico",
        titulo: "Seguro de transporte vencido",
        detalle: `${unidad.empresa} ${unidad.placa}: póliza vencida el ${vence.toLocaleDateString("es-SV")}.`,
      });
    } else if (vence <= limitDate) {
      alerts.push({
        id,
        nivel: "preventivo",
        titulo: "Seguro de transporte por vencer",
        detalle: `${unidad.empresa} ${unidad.placa}: vence el ${vence.toLocaleDateString("es-SV")}.`,
      });
    }
  }
  return alerts;
}

export async function getDashboardMetrics(auth: DashboardAuthProfile): Promise<DashboardMetrics> {
  const now = new Date();
  const plus30Days = addDays(now, 30);
  const startYear = new Date(now.getFullYear(), 0, 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const monthEnd = endOfMonth(now);

  const guiaFilter = auth?.rol === "guia" ? auth.guiaId : undefined;

  const [vagosCountResult, tours] = await Promise.all([getActiveVagosCountSafe(), toursService.list(guiaFilter)]);

  const tourIds = tours.map((t) => t.id);

  const [ingresosMes, alertsDocs, alertsTransport] = await Promise.all([
    computeMonthlyIncome(auth, monthStart, monthEnd, tourIds),
    (async (): Promise<DashboardAlert[]> => {
      if (auth?.rol === "guia" && auth.guiaId) {
        return collectDocumentAlerts([auth.guiaId]);
      }
      if (auth?.rol === "admin" || auth?.rol === "operador") {
        const guias = await guiasService.list();
        return collectDocumentAlerts(guias.map((g) => g.id));
      }
      return [];
    })(),
    auth?.rol === "admin" || auth?.rol === "operador" || auth?.rol === "guia" ? collectTransportAlerts() : [],
  ]);

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

  const alerts = [...alertsDocs, ...alertsTransport].sort((a, b) => {
    if (a.nivel === b.nivel) {
      return 0;
    }
    return a.nivel === "critico" ? -1 : 1;
  });

  return {
    toursProximos30Dias: upcomingTours.length,
    vagosActivos: vagosCountResult.count,
    ingresosMes,
    toursAnioRealizados,
    hasRestrictedMetrics: vagosCountResult.restricted,
    upcomingTours: upcomingRows,
    alerts,
  };
}
