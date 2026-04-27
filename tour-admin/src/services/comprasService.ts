import { addDoc, collection, getDocs, orderBy, query, serverTimestamp } from "firebase/firestore";
import type { Compra } from "@/types/compra.types";
import { db } from "./firebase";

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
};
