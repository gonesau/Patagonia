import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { timestampToDate } from "./firestoreMappers";
import { registerAuditLog } from "./auditoriaService";

/**
 * Mapa de colecciones soft-deletables al nombre del campo que indica si el
 * registro está activo. Algunas entidades históricas usan `activa` (femenino),
 * el resto usa `activo`.
 */
export const SOFT_DELETE_FIELD = {
  vagos: "activo",
  tour_plantillas: "activa",
  tours: "activo",
  guias: "activo",
  transporte: "activo",
  terrenos: "activo",
  usuarios_sistema: "activo",
  categoriasCompra: "activo",
  tiposVehiculo: "activo",
  relacionesEmergencia: "activo",
  metodosPago: "activo",
  estadosGuia: "activo",
  nivelesExperiencia: "activo",
} as const;

export type SoftDeletableCollection = keyof typeof SOFT_DELETE_FIELD;

export interface AuditContext {
  usuarioId: string;
  usuarioEmail: string;
}

export interface InactiveRecord {
  id: string;
  nombre: string;
  descripcion?: string;
  eliminadoEn?: Date;
  eliminadoPor?: string;
  activeFieldValue: boolean;
  raw: Record<string, unknown>;
}

const PERMANENT_DELETE_AUDIT_DETAIL = "eliminacion_definitiva";
const RESTORE_AUDIT_DETAIL = "reactivacion";

function getActiveField(collectionName: SoftDeletableCollection): "activo" | "activa" {
  return SOFT_DELETE_FIELD[collectionName];
}

function deriveDisplayName(raw: Record<string, unknown>): string {
  const nombre = typeof raw.nombre === "string" ? raw.nombre : "";
  const apellido = typeof raw.apellido === "string" ? raw.apellido : "";
  if (nombre && apellido) {
    return `${nombre} ${apellido}`.trim();
  }
  if (nombre) {
    return nombre;
  }
  if (typeof raw.empresa === "string" && raw.empresa) {
    const placa = typeof raw.placa === "string" ? ` (${raw.placa})` : "";
    return `${raw.empresa}${placa}`;
  }
  if (typeof raw.email === "string" && raw.email) {
    return raw.email;
  }
  return "";
}

function buildInactiveRecord(
  id: string,
  raw: Record<string, unknown>,
  activeField: "activo" | "activa",
): InactiveRecord {
  const normalized = timestampToDate(raw);
  return {
    id,
    nombre: deriveDisplayName(normalized) || id,
    descripcion: typeof normalized.descripcion === "string" ? normalized.descripcion : undefined,
    eliminadoEn: normalized.eliminadoEn instanceof Date ? normalized.eliminadoEn : undefined,
    eliminadoPor: typeof normalized.eliminadoPor === "string" ? normalized.eliminadoPor : undefined,
    activeFieldValue: Boolean(normalized[activeField]),
    raw: normalized,
  };
}

export const softDeleteService = {
  async softDelete(
    collectionName: SoftDeletableCollection,
    docId: string,
    context: AuditContext,
  ): Promise<void> {
    const activeField = getActiveField(collectionName);
    await updateDoc(doc(db, collectionName, docId), {
      [activeField]: false,
      actualizadoEn: serverTimestamp(),
    });
    await registerAuditLog({
      usuarioId: context.usuarioId,
      usuarioEmail: context.usuarioEmail,
      accion: "delete",
      entidad: collectionName,
      entidadId: docId,
    });
  },

  async restore(
    collectionName: SoftDeletableCollection,
    docId: string,
    context: AuditContext,
  ): Promise<void> {
    const activeField = getActiveField(collectionName);
    await updateDoc(doc(db, collectionName, docId), {
      [activeField]: true,
      actualizadoEn: serverTimestamp(),
    });
    await registerAuditLog({
      usuarioId: context.usuarioId,
      usuarioEmail: context.usuarioEmail,
      accion: "update",
      entidad: collectionName,
      entidadId: docId,
      detalle: RESTORE_AUDIT_DETAIL,
    });
  },

  async permanentDelete(
    collectionName: SoftDeletableCollection,
    docId: string,
    context: AuditContext,
  ): Promise<void> {
    await updateDoc(doc(db, collectionName, docId), {
      eliminadoDefinitivamente: true,
      eliminadoEn: serverTimestamp(),
      eliminadoPor: context.usuarioId,
      actualizadoEn: serverTimestamp(),
    });
    await registerAuditLog({
      usuarioId: context.usuarioId,
      usuarioEmail: context.usuarioEmail,
      accion: "delete",
      entidad: collectionName,
      entidadId: docId,
      detalle: PERMANENT_DELETE_AUDIT_DETAIL,
    });
  },

  async listInactive(collectionName: SoftDeletableCollection): Promise<InactiveRecord[]> {
    const activeField = getActiveField(collectionName);
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(
      query(collectionRef, where(activeField, "==", false), orderBy("actualizadoEn", "desc")),
    ).catch(async () => {
      // Algunas colecciones no tienen `actualizadoEn`. Fallback sin orden.
      return getDocs(query(collectionRef, where(activeField, "==", false)));
    });
    return snapshot.docs
      .map((docSnap) =>
        buildInactiveRecord(docSnap.id, docSnap.data() as Record<string, unknown>, activeField),
      )
      .filter((record) => !record.raw.eliminadoDefinitivamente);
  },
};
