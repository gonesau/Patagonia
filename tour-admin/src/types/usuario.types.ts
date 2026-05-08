export type UserRole = "admin" | "guia" | "operador";

export interface UsuarioSistema {
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
