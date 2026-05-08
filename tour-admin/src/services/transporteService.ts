import {
  addDoc,
  collection,
  deleteField,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  doc,
} from "firebase/firestore";
import type { Transporte } from "@/types/transporte.types";
import { db } from "./firebase";
import { ServiceError } from "./serviceErrors";

const transporteCollection = collection(db, "transporte");

async function ensureUniquePlaca(placa: string, excludeId?: string): Promise<void> {
  const placaQuery = query(transporteCollection, where("placa", "==", placa), limit(1));
  const snapshot = await getDocs(placaQuery);
  const first = snapshot.docs[0];
  if (first && first.id !== excludeId) {
    throw new ServiceError("La placa ya está registrada.");
  }
}

export const transporteService = {
  async list(): Promise<Transporte[]> {
    const listQuery = query(transporteCollection, orderBy("empresa", "asc"));
    const snapshot = await getDocs(listQuery);
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Transporte);
  },
  async create(data: Omit<Transporte, "id">): Promise<void> {
    await ensureUniquePlaca(data.placa);
    await addDoc(transporteCollection, { ...data, creadoEn: serverTimestamp() });
  },
  async update(transporteId: string, data: Partial<Transporte>): Promise<void> {
    if (data.placa) {
      await ensureUniquePlaca(data.placa, transporteId);
    }
    await updateDoc(doc(db, "transporte", transporteId), {
      ...data,
      tipoCombustible: deleteField(),
      seguroPoliza: deleteField(),
      seguroVence: deleteField(),
    });
  },
};
