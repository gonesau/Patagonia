export type UserRole = "admin" | "guia";

export interface UsuarioSistema {
  id: string;
  email: string;
  nombre: string;
  rol: UserRole;
  guiaId?: string;
  activo: boolean;
  ultimoAcceso?: Date;
  creadoEn: Date;
}
