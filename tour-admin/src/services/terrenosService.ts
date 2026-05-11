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
    eliminadoDefinitivamente:
      typeof normalized.eliminadoDefinitivamente === "boolean"
        ? normalized.eliminadoDefinitivamente
        : undefined,
    eliminadoEn: normalized.eliminadoEn instanceof Date ? normalized.eliminadoEn : undefined,
    eliminadoPor: typeof normalized.eliminadoPor === "string" ? normalized.eliminadoPor : undefined,
    creadoEn: normalized.creadoEn instanceof Date ? normalized.creadoEn : new Date(),
    actualizadoEn: normalized.actualizadoEn instanceof Date ? normalized.actualizadoEn : new Date(),
  };
}

type TerrenoCreatePayload = Pick<Terreno, "nombre" | "descripcion" | "factor">;
type TerrenoUpdatePayload = Partial<Pick<Terreno, "nombre" | "descripcion" | "activo" | "factor">>;

const DEFAULT_TERRENOS: readonly TerrenoCreatePayload[] = [
  {
    nombre: "Pavimento / Concreto",
    descripcion: "Calles adoquinadas, asfalto o pasarelas de madera. Cero pérdida de tracción.",
    factor: 1.0,
  },
  {
    nombre: "Tierra Compacta",
    descripcion: "Senderos forestales limpios, secos y estables. Excelente agarre.",
    factor: 1.1,
  },
  {
    nombre: "Bosque con Raíces",
    descripcion: "Suelo húmedo de bosque con obstáculos constantes que exigen atención.",
    factor: 1.2,
  },
  {
    nombre: "Piedra Suelta / Balasto",
    descripcion: "Caminos de herradura, lechos de ríos secos. Inestabilidad constante.",
    factor: 1.3,
  },
  {
    nombre: "Lodo / Arcilla Húmeda",
    descripcion: "Suelo resbaladizo de invierno. Exige esfuerzo extra para mantener el equilibrio.",
    factor: 1.4,
  },
  {
    nombre: "Ceniza Volcánica (Scree)",
    descripcion: "Arena negra suelta o ceniza profunda. Pérdida de hasta un 50% de tracción por paso.",
    factor: 1.5,
  },
  {
    nombre: "Roca / Trepada Técnica",
    descripcion: "Secciones de roca donde se requiere el uso de manos para progresar.",
    factor: 1.5,
  },
];

export const terrenosService = {
  async listAll(): Promise<Terreno[]> {
    const snapshot = await getDocs(query(terrenosCollection, orderBy("nombre", "asc")));
    return snapshot.docs.map((item) => mapTerreno(item.id, item.data()));
  },
  async listVisible(): Promise<Terreno[]> {
    const data = await this.listAll();
    return data.filter((item) => !item.eliminadoDefinitivamente);
  },
  async listActive(): Promise<Terreno[]> {
    const data = await this.listAll();
    return data.filter((item) => item.activo && !item.eliminadoDefinitivamente);
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
  async seedDefaults(): Promise<number> {
    const existing = await getDocs(query(terrenosCollection));
    if (!existing.empty) {
      return 0;
    }
    for (const item of DEFAULT_TERRENOS) {
      await addDoc(terrenosCollection, {
        nombre: item.nombre,
        descripcion: item.descripcion,
        factor: parseFactor(item.factor),
        activo: true,
        creadoEn: serverTimestamp(),
        actualizadoEn: serverTimestamp(),
      });
    }
    return DEFAULT_TERRENOS.length;
  },
};
