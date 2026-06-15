import { collection, doc, getDocs, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import type { UsuarioSistema, UserRole } from "@/types/usuario.types";
import { db } from "./firebase";
import { timestampToDate } from "./firestoreMappers";

const usuariosCollection = collection(db, "usuarios_sistema");

function mapUsuario(id: string, data: Record<string, unknown>): UsuarioSistema {
  const normalizedData = timestampToDate(data);
  return {
    id,
    email: String(normalizedData.email ?? ""),
    nombre: String(normalizedData.nombre ?? ""),
    rol: (normalizedData.rol as UserRole) ?? "operador",
    guiaId: typeof normalizedData.guiaId === "string" ? normalizedData.guiaId : undefined,
    activo: Boolean(normalizedData.activo),
    invitacionPendiente: Boolean(normalizedData.invitacionPendiente),
    eliminadoDefinitivamente:
      typeof normalizedData.eliminadoDefinitivamente === "boolean"
        ? normalizedData.eliminadoDefinitivamente
        : undefined,
    eliminadoEn: normalizedData.eliminadoEn instanceof Date ? normalizedData.eliminadoEn : undefined,
    eliminadoPor:
      typeof normalizedData.eliminadoPor === "string" ? normalizedData.eliminadoPor : undefined,
    ultimoAcceso: normalizedData.ultimoAcceso instanceof Date ? normalizedData.ultimoAcceso : undefined,
    creadoEn: normalizedData.creadoEn instanceof Date ? normalizedData.creadoEn : new Date(),
    actualizadoEn: normalizedData.actualizadoEn instanceof Date ? normalizedData.actualizadoEn : undefined,
  };
}

export const usuariosSistemaService = {
  async listAll(): Promise<UsuarioSistema[]> {
    const snapshot = await getDocs(query(usuariosCollection, orderBy("creadoEn", "desc")));
    return snapshot.docs
      .map((item) => mapUsuario(item.id, item.data()))
      .filter((user) => !user.eliminadoDefinitivamente);
  },
  async updateRole(userId: string, role: UserRole): Promise<void> {
    await updateDoc(doc(db, "usuarios_sistema", userId), { rol: role, actualizadoEn: serverTimestamp() });
  },
  async updateActive(userId: string, active: boolean): Promise<void> {
    await updateDoc(doc(db, "usuarios_sistema", userId), { activo: active, actualizadoEn: serverTimestamp() });
  },
  async updateGuia(userId: string, guiaId?: string): Promise<void> {
    await updateDoc(doc(db, "usuarios_sistema", userId), { guiaId: guiaId ?? null, actualizadoEn: serverTimestamp() });
  },
  async registerLastAccess(userId: string): Promise<void> {
    await updateDoc(doc(db, "usuarios_sistema", userId), { ultimoAcceso: serverTimestamp() });
  },
};
