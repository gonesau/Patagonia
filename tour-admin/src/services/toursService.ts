import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
} from "firebase/firestore";
import type { TourOcurrencia } from "@/types/tour.types";
import { db } from "./firebase";
import { timestampToDate } from "./firestoreMappers";
import { DEFAULT_PAGE_SIZE, type PaginatedResult, type PaginationParams } from "./pagination";

const toursCollection = collection(db, "tours");

export const toursService = {
  async list(guiaId?: string): Promise<TourOcurrencia[]> {
    const baseQuery = guiaId
      ? query(toursCollection, where("guiaId", "==", guiaId), orderBy("fechaInicio", "desc"))
      : query(toursCollection, orderBy("fechaInicio", "desc"));
    const snapshot = await getDocs(baseQuery);
    return snapshot.docs.map(
      (item) =>
        ({
          id: item.id,
          ...timestampToDate(item.data() as Record<string, unknown>),
        }) as TourOcurrencia,
    );
  },
  async create(data: Omit<TourOcurrencia, "id" | "creadoEn" | "actualizadoEn">): Promise<void> {
    await addDoc(toursCollection, {
      ...data,
      creadoEn: serverTimestamp(),
      actualizadoEn: serverTimestamp(),
    });
  },
  async update(tourId: string, data: Partial<TourOcurrencia>): Promise<void> {
    await updateDoc(doc(db, "tours", tourId), { ...data, actualizadoEn: serverTimestamp() });
  },
  async listPage(options: PaginationParams & { guiaId?: string } = {}): Promise<PaginatedResult<TourOcurrencia>> {
    const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
    const constraints = [];
    if (options.guiaId) {
      constraints.push(where("guiaId", "==", options.guiaId));
    }
    constraints.push(orderBy("fechaInicio", "desc"));
    if (options.cursor) {
      constraints.push(startAfter(options.cursor));
    }
    constraints.push(limit(pageSize));
    const snapshot = await getDocs(query(toursCollection, ...constraints));
    const items = snapshot.docs.map(
      (item) =>
        ({
          id: item.id,
          ...timestampToDate(item.data() as Record<string, unknown>),
        }) as TourOcurrencia,
    );
    return {
      items,
      nextCursor: snapshot.docs.length === pageSize ? snapshot.docs[snapshot.docs.length - 1] : undefined,
    };
  },
};
