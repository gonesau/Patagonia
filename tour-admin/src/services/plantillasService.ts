import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  doc,
} from "firebase/firestore";
import type { TourPlantilla } from "@/types/tour.types";
import { db } from "./firebase";

const plantillasCollection = collection(db, "tour_plantillas");

export const plantillasService = {
  async list(): Promise<TourPlantilla[]> {
    const listQuery = query(plantillasCollection, orderBy("creadoEn", "desc"));
    const snapshot = await getDocs(listQuery);
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as TourPlantilla);
  },
  async create(data: Omit<TourPlantilla, "id" | "creadoEn">): Promise<void> {
    await addDoc(plantillasCollection, { ...data, creadoEn: serverTimestamp() });
  },
  async update(plantillaId: string, data: Partial<TourPlantilla>): Promise<void> {
    await updateDoc(doc(db, "tour_plantillas", plantillaId), data);
  },
};
