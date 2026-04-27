import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  doc,
} from "firebase/firestore";
import type { Guia } from "@/types/guia.types";
import { db } from "./firebase";
import { ServiceError } from "./serviceErrors";

const guiasCollection = collection(db, "guias");

async function ensureUniqueEmail(email: string, excludeId?: string): Promise<void> {
  const emailQuery = query(guiasCollection, where("email", "==", email), limit(1));
  const snapshot = await getDocs(emailQuery);
  const first = snapshot.docs[0];
  if (first && first.id !== excludeId) {
    throw new ServiceError("Ya existe un guía registrado con ese correo.");
  }
}

export const guiasService = {
  async list(): Promise<Guia[]> {
    const listQuery = query(guiasCollection, orderBy("creadoEn", "desc"));
    const snapshot = await getDocs(listQuery);
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Guia);
  },
  async create(data: Omit<Guia, "id" | "creadoEn">): Promise<void> {
    await ensureUniqueEmail(data.email);
    await addDoc(guiasCollection, { ...data, creadoEn: serverTimestamp() });
  },
  async update(guiaId: string, data: Partial<Guia>): Promise<void> {
    if (data.email) {
      await ensureUniqueEmail(data.email, guiaId);
    }
    await updateDoc(doc(db, "guias", guiaId), data);
  },
};
