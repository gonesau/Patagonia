import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

interface AuditLogInput {
  usuarioId: string;
  usuarioEmail: string;
  accion: "create" | "update" | "delete" | "login" | "export" | "send_email" | "crear_drive";
  entidad: string;
  entidadId: string;
}

export async function registerAuditLog(input: AuditLogInput) {
  await addDoc(collection(db, "auditoria"), {
    ...input,
    timestamp: serverTimestamp(),
  });
}
