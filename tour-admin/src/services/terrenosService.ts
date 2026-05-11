import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import type { Terreno } from "@/types/terreno.types";
import { db } from "./firebase";
import { timestampToDate } from "./firestoreMappers";

const COLLECTION_NAME = "terrenos";
const DEFAULT_FACTOR = 1.0;
const terrenosCollection = collection(db, COLLECTION_NAME);

function parseFactor(raw: unknown): number {
  const parsed = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_FACTOR;
}

function mapTerreno(id: string, data: Record<string, unknown>): Terreno {
  const normalized = timestampToDate(data);
  return {
    id,
    nombre: String(normalized.nombre ?? ""),
    descripcion: String(normalized.descripcion ?? ""),
    activo: Boolean(normalized.activo),
    factor: parseFactor(normalized.factor),
    creadoEn: normalized.creadoEn instanceof Date ? normalized.creadoEn : new Date(),
    actualizadoEn: normalized.actualizadoEn instanceof Date ? normalized.actualizadoEn : new Date(),
  };
}

type TerrenoCreatePayload = Pick<Terreno, "nombre" | "descripcion" | "factor">;
type TerrenoUpdatePayload = Partial<Pick<Terreno, "nombre" | "descripcion" | "activo" | "factor">>;

export const terrenosService = {
  async listAll(): Promise<Terreno[]> {
    const snapshot = await getDocs(query(terrenosCollection, orderBy("nombre", "asc")));
    return snapshot.docs.map((item) => mapTerreno(item.id, item.data()));
  },
  async listActive(): Promise<Terreno[]> {
    const data = await this.listAll();
    return data.filter((item) => item.activo);
  },
  async create(payload: TerrenoCreatePayload): Promise<void> {
    await addDoc(terrenosCollection, {
      nombre: payload.nombre,
      descripcion: payload.descripcion,
      factor: parseFactor(payload.factor),
      activo: true,
      creadoEn: serverTimestamp(),
      actualizadoEn: serverTimestamp(),
    });
  },
  async update(itemId: string, payload: TerrenoUpdatePayload): Promise<void> {
    const updatePayload: Record<string, unknown> = { actualizadoEn: serverTimestamp() };
    if (payload.nombre !== undefined) {
      updatePayload.nombre = payload.nombre;
    }
    if (payload.descripcion !== undefined) {
      updatePayload.descripcion = payload.descripcion;
    }
    if (payload.activo !== undefined) {
      updatePayload.activo = payload.activo;
    }
    if (payload.factor !== undefined) {
      updatePayload.factor = parseFactor(payload.factor);
    }
    await updateDoc(doc(db, COLLECTION_NAME, itemId), updatePayload);
  },
  async remove(itemId: string): Promise<void> {
    await updateDoc(doc(db, COLLECTION_NAME, itemId), {
      activo: false,
      actualizadoEn: serverTimestamp(),
    });
  },
};
