import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { timestampToDate } from "./firestoreMappers";

export interface AuditLogInput {
  usuarioId: string;
  usuarioEmail: string;
  accion: "create" | "update" | "delete" | "login" | "export" | "send_email" | "crear_drive";
  entidad: string;
  entidadId: string;
  detalle?: string;
}

export interface AuditLogEntry {
  id: string;
  usuarioId: string;
  usuarioEmail: string;
  accion: AuditLogInput["accion"];
  entidad: string;
  entidadId: string;
  timestamp: Date;
  detalle?: string;
}

export async function registerAuditLog(input: AuditLogInput): Promise<void> {
  const payload: Record<string, unknown> = {
    usuarioId: input.usuarioId,
    usuarioEmail: input.usuarioEmail,
    accion: input.accion,
    entidad: input.entidad,
    entidadId: input.entidadId,
    timestamp: serverTimestamp(),
  };
  if (input.detalle) {
    payload.detalle = input.detalle;
  }
  await addDoc(collection(db, "auditoria"), payload);
}

export async function listRecentAuditLogs(limitCount = 100): Promise<AuditLogEntry[]> {
  const snapshot = await getDocs(
    query(collection(db, "auditoria"), orderBy("timestamp", "desc"), limit(limitCount)),
  );
  return snapshot.docs.map((docSnap) =>
    timestampToDate({ id: docSnap.id, ...docSnap.data() } as Record<string, unknown>) as unknown as AuditLogEntry,
  );
}
