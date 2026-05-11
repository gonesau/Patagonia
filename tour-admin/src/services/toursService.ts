import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
  type QueryConstraint,
} from "firebase/firestore";
import type { TourOcurrencia } from "@/types/tour.types";
import { db } from "./firebase";
import { timestampToDate } from "./firestoreMappers";
import { DEFAULT_PAGE_SIZE, type PaginatedResult, type PaginationParams } from "./pagination";

import type { EstadoTourId } from "@/types/estadoTour.types";

const toursCollection = collection(db, "tours");

/**
 * Calcula el estado operativo de un tour en tiempo de lectura.
 * Prioridad: cancelado manual → en_curso → realizado → programado.
 */
function calcularEstadoTour(tour: TourOcurrencia): EstadoTourId {
  if (tour.cancelado === true) {
    return "cancelado";
  }
  const now = new Date();
  const inicio = new Date(tour.fechaInicio);
  const fin = new Date(tour.fechaFin);
  if (inicio <= now && now <= fin) {
    return "en_curso";
  }
  if (fin < now) {
    return "realizado";
  }
  return "programado";
}

function normalizeTour(data: Record<string, unknown>, id: string): TourOcurrencia {
  const mappedData = timestampToDate(data) as unknown as TourOcurrencia;
  const normalizedGuideIds =
    Array.isArray(mappedData.guiaIds) && mappedData.guiaIds.length > 0
      ? mappedData.guiaIds.filter((value): value is string => typeof value === "string" && value.length > 0)
      : mappedData.guiaId
        ? [mappedData.guiaId]
        : [];

  const normalized: TourOcurrencia = {
    ...mappedData,
    id,
    guiaIds: normalizedGuideIds,
    guiaId: normalizedGuideIds[0] || mappedData.guiaId || "",
  };

  // Estado calculado dinámicamente; sobrescribe cualquier valor guardado en Firestore.
  normalized.estado = calcularEstadoTour(normalized);

  return normalized;
}

function isVisibleTour(item: TourOcurrencia): boolean {
  return (item.activo ?? true) === true && !item.eliminadoDefinitivamente;
}

export const toursService = {
  async getById(tourId: string): Promise<TourOcurrencia | null> {
    const snapshot = await getDoc(doc(db, "tours", tourId));
    if (!snapshot.exists()) {
      return null;
    }
    return normalizeTour(snapshot.data() as Record<string, unknown>, snapshot.id);
  },

  async listByPlantilla(
    plantillaId: string,
    options: { includeInactive?: boolean } = {},
  ): Promise<TourOcurrencia[]> {
    const snapshot = await getDocs(query(toursCollection, where("plantillaId", "==", plantillaId)));
    const all = snapshot.docs.map((item) => normalizeTour(item.data() as Record<string, unknown>, item.id));
    const filtered = options.includeInactive ? all : all.filter(isVisibleTour);
    return filtered.sort((a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime());
  },

  async listOnLocalDate(day: Date): Promise<TourOcurrencia[]> {
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
    const end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999);
    const snapshot = await getDocs(
      query(
        toursCollection,
        where("fechaInicio", ">=", Timestamp.fromDate(start)),
        where("fechaInicio", "<=", Timestamp.fromDate(end)),
      ),
    );
    return snapshot.docs
      .map((item) => normalizeTour(item.data() as Record<string, unknown>, item.id))
      .filter(isVisibleTour);
  },

  async list(guiaId?: string): Promise<TourOcurrencia[]> {
    if (guiaId) {
      const page = await this.listPage({ guiaId, pageSize: 500 });
      return page.items;
    }
    const snapshot = await getDocs(query(toursCollection, orderBy("fechaInicio", "desc")));
    return snapshot.docs
      .map((item) => normalizeTour(item.data() as Record<string, unknown>, item.id))
      .filter(isVisibleTour);
  },
  async create(data: Omit<TourOcurrencia, "id" | "creadoEn" | "actualizadoEn" | "estado">): Promise<void> {
    const guiaIds = data.guiaIds?.filter((value) => value.length > 0) ?? (data.guiaId ? [data.guiaId] : []);
    await addDoc(toursCollection, {
      ...data,
      guiaIds,
      guiaId: guiaIds[0] || data.guiaId || "",
      creadoEn: serverTimestamp(),
      actualizadoEn: serverTimestamp(),
    });
  },
  async update(tourId: string, data: Partial<Omit<TourOcurrencia, "estado">>): Promise<void> {
    const guiaIds =
      data.guiaIds !== undefined
        ? data.guiaIds.filter((value) => value.length > 0)
        : data.guiaId
          ? [data.guiaId]
          : undefined;
    const payload =
      guiaIds !== undefined
        ? { ...data, guiaIds, guiaId: guiaIds[0] || data.guiaId || "" }
        : data;
    await updateDoc(doc(db, "tours", tourId), { ...payload, actualizadoEn: serverTimestamp() });
  },
  async listPage(options: PaginationParams & { guiaId?: string } = {}): Promise<PaginatedResult<TourOcurrencia>> {
    const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
    if (options.guiaId) {
      const [byPrimary, byList] = await Promise.all([
        getDocs(query(toursCollection, where("guiaId", "==", options.guiaId), limit(300))),
        getDocs(query(toursCollection, where("guiaIds", "array-contains", options.guiaId), limit(300))),
      ]);
      const merged = new Map<string, TourOcurrencia>();
      for (const docSnap of byPrimary.docs) {
        merged.set(docSnap.id, normalizeTour(docSnap.data() as Record<string, unknown>, docSnap.id));
      }
      for (const docSnap of byList.docs) {
        merged.set(docSnap.id, normalizeTour(docSnap.data() as Record<string, unknown>, docSnap.id));
      }
      const sorted = Array.from(merged.values())
        .filter(isVisibleTour)
        .sort((a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime());
      return {
        items: sorted.slice(0, pageSize),
        nextCursor: undefined,
      };
    }
    const constraints: QueryConstraint[] = [orderBy("fechaInicio", "desc")];
    if (options.cursor) {
      constraints.push(startAfter(options.cursor));
    }
    constraints.push(limit(pageSize));
    const snapshot = await getDocs(query(toursCollection, ...constraints));
    const items = snapshot.docs
      .map((item) => normalizeTour(item.data() as Record<string, unknown>, item.id))
      .filter(isVisibleTour);
    return {
      items,
      nextCursor: snapshot.docs.length === pageSize ? snapshot.docs[snapshot.docs.length - 1] : undefined,
    };
  },
  /** Activa la bandera de cancelación manual. El estado calculado será `'cancelado'` en lecturas futuras. */
  async cancelTour(tourId: string): Promise<void> {
    await updateDoc(doc(db, "tours", tourId), { cancelado: true, actualizadoEn: serverTimestamp() });
  },
  /** Revierte la cancelación manual de un tour. El estado volverá a calcularse según fechas. */
  async uncancelTour(tourId: string): Promise<void> {
    await updateDoc(doc(db, "tours", tourId), { cancelado: false, actualizadoEn: serverTimestamp() });
  },
};
