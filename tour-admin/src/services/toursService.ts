import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import type { TourOcurrencia } from "@/types/tour.types";
import { db } from "./firebase";

const toursCollection = collection(db, "tours");

export const toursService = {
  async list(guiaId?: string): Promise<TourOcurrencia[]> {
    const baseQuery = guiaId
      ? query(toursCollection, where("guiaId", "==", guiaId), orderBy("fechaInicio", "desc"))
      : query(toursCollection, orderBy("fechaInicio", "desc"));
    const snapshot = await getDocs(baseQuery);
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as TourOcurrencia);
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
};
