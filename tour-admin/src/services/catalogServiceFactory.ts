import { addDoc, collection, doc, getDocs, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import type { CatalogItem } from "@/types/catalog.types";
import { db } from "./firebase";
import { timestampToDate } from "./firestoreMappers";

function mapCatalogItem<T extends CatalogItem>(id: string, data: Record<string, unknown>): T {
  const normalizedData = timestampToDate(data);
  return {
    id,
    nombre: String(normalizedData.nombre ?? ""),
    descripcion: String(normalizedData.descripcion ?? ""),
    activo: Boolean(normalizedData.activo),
    creadoEn: normalizedData.creadoEn instanceof Date ? normalizedData.creadoEn : new Date(),
    actualizadoEn: normalizedData.actualizadoEn instanceof Date ? normalizedData.actualizadoEn : new Date(),
  } as T;
}

export function createCatalogService<T extends CatalogItem>(collectionName: string) {
  const catalogCollection = collection(db, collectionName);
  return {
    async listAll(): Promise<T[]> {
      const snapshot = await getDocs(query(catalogCollection, orderBy("nombre", "asc")));
      return snapshot.docs.map((item) => mapCatalogItem<T>(item.id, item.data()));
    },
    async listActive(): Promise<T[]> {
      const data = await this.listAll();
      return data.filter((item) => item.activo);
    },
    async create(data: Pick<T, "nombre" | "descripcion">): Promise<void> {
      await addDoc(catalogCollection, {
        nombre: data.nombre,
        descripcion: data.descripcion,
        activo: true,
        creadoEn: serverTimestamp(),
        actualizadoEn: serverTimestamp(),
      });
    },
    async update(itemId: string, data: Partial<Pick<T, "nombre" | "descripcion" | "activo">>): Promise<void> {
      await updateDoc(doc(db, collectionName, itemId), { ...data, actualizadoEn: serverTimestamp() });
    },
    async remove(itemId: string): Promise<void> {
      await updateDoc(doc(db, collectionName, itemId), { activo: false, actualizadoEn: serverTimestamp() });
    },
  };
}
