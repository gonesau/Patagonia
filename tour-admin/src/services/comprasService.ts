import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp, startAfter, type QueryConstraint } from "firebase/firestore";
import type { Compra } from "@/types/compra.types";
import { db } from "./firebase";
import { DEFAULT_PAGE_SIZE, type PaginatedResult, type PaginationParams } from "./pagination";

export const comprasService = {
  async listByTour(tourId: string): Promise<Compra[]> {
    const comprasCollection = collection(db, "tours", tourId, "compras");
    const snapshot = await getDocs(query(comprasCollection, orderBy("fecha", "desc")));
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Compra);
  },
  async create(tourId: string, data: Omit<Compra, "id">): Promise<void> {
    const comprasCollection = collection(db, "tours", tourId, "compras");
    await addDoc(comprasCollection, { ...data, creadoEn: serverTimestamp() });
  },
  async listPageByTour(tourId: string, options: PaginationParams = {}): Promise<PaginatedResult<Compra>> {
    const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
    const comprasCollection = collection(db, "tours", tourId, "compras");
    const constraints: QueryConstraint[] = [orderBy("fecha", "desc"), limit(pageSize)];
    if (options.cursor) {
      constraints.splice(1, 0, startAfter(options.cursor));
    }
    const snapshot = await getDocs(query(comprasCollection, ...constraints));
    const items = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Compra);
    return {
      items,
      nextCursor: snapshot.docs.length === pageSize ? snapshot.docs[snapshot.docs.length - 1] : undefined,
    };
  },
};
