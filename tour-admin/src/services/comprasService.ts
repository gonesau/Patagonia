import {
  addDoc,
  collection,
  deleteDoc,
  doc,
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
import type { Compra } from "@/types/compra.types";
import { db } from "./firebase";
import { timestampToDate } from "./firestoreMappers";
import { DEFAULT_PAGE_SIZE, type PaginatedResult, type PaginationParams } from "./pagination";

const comprasCollection = collection(db, "compras");

function mapCompra(snapshotData: Record<string, unknown>, id: string): Compra {
  const normalizedData = timestampToDate(snapshotData);
  return {
    id,
    nombre: String(normalizedData.nombre ?? ""),
    descripcion: String(normalizedData.descripcion ?? ""),
    categoriaId: String(normalizedData.categoriaId ?? ""),
    categoriaNombreSnapshot: String(normalizedData.categoriaNombreSnapshot ?? ""),
    monto: Number(normalizedData.monto ?? 0),
    fecha: normalizedData.fecha instanceof Date ? normalizedData.fecha : new Date(),
    tourId: typeof normalizedData.tourId === "string" ? normalizedData.tourId : null,
    creadoEn: normalizedData.creadoEn instanceof Date ? normalizedData.creadoEn : undefined,
    actualizadoEn: normalizedData.actualizadoEn instanceof Date ? normalizedData.actualizadoEn : undefined,
  };
}

export const comprasService = {
  async listByTour(tourId: string): Promise<Compra[]> {
    const [rootSnapshot, legacySnapshot] = await Promise.all([
      getDocs(query(comprasCollection, where("tourId", "==", tourId), orderBy("fecha", "desc"))),
      getDocs(query(collection(db, "tours", tourId, "compras"), orderBy("fecha", "desc"))),
    ]);
    const rootItems = rootSnapshot.docs.map((item) => mapCompra(item.data(), item.id));
    const legacyItems = legacySnapshot.docs.map((item) =>
      mapCompra({ ...item.data(), tourId, nombre: item.data().nombre ?? "Compra sin nombre" }, item.id),
    );
    const purchasesById = new Map<string, Compra>();
    [...rootItems, ...legacyItems].forEach((item) => purchasesById.set(item.id, item));
    return [...purchasesById.values()].sort((left, right) => right.fecha.getTime() - left.fecha.getTime());
  },
  async listGeneral(): Promise<Compra[]> {
    const snapshot = await getDocs(query(comprasCollection, where("tourId", "==", null), orderBy("fecha", "desc")));
    return snapshot.docs.map((item) => mapCompra(item.data(), item.id));
  },
  async listAll(): Promise<Compra[]> {
    const snapshot = await getDocs(query(comprasCollection, orderBy("fecha", "desc")));
    return snapshot.docs.map((item) => mapCompra(item.data(), item.id));
  },
  async create(data: Omit<Compra, "id" | "creadoEn" | "actualizadoEn">): Promise<void> {
    await addDoc(comprasCollection, {
      ...data,
      tourId: data.tourId ?? null,
      creadoEn: serverTimestamp(),
      actualizadoEn: serverTimestamp(),
    });
  },
  async update(compraId: string, data: Partial<Omit<Compra, "id" | "creadoEn" | "actualizadoEn">>): Promise<void> {
    await updateDoc(doc(db, "compras", compraId), { ...data, actualizadoEn: serverTimestamp() });
  },
  async remove(compraId: string): Promise<void> {
    await deleteDoc(doc(db, "compras", compraId));
  },
  async listPageByTour(tourId: string, options: PaginationParams = {}): Promise<PaginatedResult<Compra>> {
    const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
    const constraints: QueryConstraint[] = [where("tourId", "==", tourId), orderBy("fecha", "desc"), limit(pageSize)];
    if (options.cursor) {
      constraints.splice(2, 0, startAfter(options.cursor));
    }
    const snapshot = await getDocs(query(comprasCollection, ...constraints));
    const items = snapshot.docs.map((item) => mapCompra(item.data(), item.id));
    return {
      items,
      nextCursor: snapshot.docs.length === pageSize ? snapshot.docs[snapshot.docs.length - 1] : undefined,
    };
  },
};
