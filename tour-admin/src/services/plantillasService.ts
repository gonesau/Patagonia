import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  doc,
  type QueryConstraint,
} from "firebase/firestore";
import type { TourPlantilla } from "@/types/tour.types";
import { db } from "./firebase";
import { DEFAULT_PAGE_SIZE, type PaginatedResult, type PaginationParams } from "./pagination";

const plantillasCollection = collection(db, "tour_plantillas");

function isVisiblePlantilla(item: TourPlantilla): boolean {
  return (item.activa ?? true) === true && !item.eliminadoDefinitivamente;
}

function mapPlantillaDoc(id: string, data: Record<string, unknown>): TourPlantilla {
  return { id, ...data } as TourPlantilla;
}

export const plantillasService = {
  async list(options: { includeInactive?: boolean } = {}): Promise<TourPlantilla[]> {
    const listQuery = query(plantillasCollection, orderBy("creadoEn", "desc"));
    const snapshot = await getDocs(listQuery);
    const items = snapshot.docs.map((item) => mapPlantillaDoc(item.id, item.data()));
    return options.includeInactive ? items : items.filter(isVisiblePlantilla);
  },
  async create(data: Omit<TourPlantilla, "id" | "creadoEn">): Promise<void> {
    await addDoc(plantillasCollection, { ...data, creadoEn: serverTimestamp() });
  },
  async update(plantillaId: string, data: Partial<TourPlantilla> | Record<string, unknown>): Promise<void> {
    await updateDoc(doc(db, "tour_plantillas", plantillaId), data);
  },
  async listPage(options: PaginationParams = {}): Promise<PaginatedResult<TourPlantilla>> {
    const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
    const constraints: QueryConstraint[] = [orderBy("creadoEn", "desc"), limit(pageSize)];
    if (options.cursor) {
      constraints.splice(1, 0, startAfter(options.cursor));
    }
    const snapshot = await getDocs(query(plantillasCollection, ...constraints));
    const items = snapshot.docs.map((item) => mapPlantillaDoc(item.id, item.data())).filter(isVisiblePlantilla);
    return {
      items,
      nextCursor: snapshot.docs.length === pageSize ? snapshot.docs[snapshot.docs.length - 1] : undefined,
    };
  },
};
