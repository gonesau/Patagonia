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
import type { Vago } from "@/types/vago.types";
import { db } from "./firebase";
import { ServiceError } from "./serviceErrors";

const vagosCollection = collection(db, "vagos");

async function ensureUniqueEmail(email: string, excludeId?: string): Promise<void> {
  const emailQuery = query(vagosCollection, where("email", "==", email), limit(1));
  const snapshot = await getDocs(emailQuery);
  const first = snapshot.docs[0];
  if (first && first.id !== excludeId) {
    throw new ServiceError("Ya existe un vago registrado con ese correo.");
  }
}

export const vagosService = {
  async list(searchTerm = ""): Promise<Vago[]> {
    const listQuery = query(vagosCollection, orderBy("creadoEn", "desc"));
    const snapshot = await getDocs(listQuery);
    const all = snapshot.docs.map(
      (item) =>
        ({
          id: item.id,
          ...item.data(),
        }) as Vago,
    );
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) {
      return all;
    }

    return all.filter((vago) =>
      [vago.nombre, vago.apellido, vago.email, vago.telefono]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  },

  async create(data: Omit<Vago, "id" | "creadoEn">): Promise<void> {
    await ensureUniqueEmail(data.email);
    await addDoc(vagosCollection, {
      ...data,
      creadoEn: serverTimestamp(),
    });
  },

  async update(vagoId: string, data: Partial<Vago>): Promise<void> {
    if (data.email) {
      await ensureUniqueEmail(data.email, vagoId);
    }
    const vagoRef = doc(db, "vagos", vagoId);
    await updateDoc(vagoRef, data);
  },
};
