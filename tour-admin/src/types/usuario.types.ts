import type { SoftDeleteFields } from "./softDelete.types";

export type UserRole = "admin" | "guia" | "operador";

export interface UsuarioSistema extends SoftDeleteFields {
  id: string;
  email: string;
  nombre: string;
  rol: UserRole;
  guiaId?: string;
  activo: boolean;
  invitacionPendiente?: boolean;
  ultimoAcceso?: Date;
  creadoEn: Date;
  actualizadoEn?: Date;
}
