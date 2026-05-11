import type { SoftDeleteFields } from "./softDelete.types";

export interface Vago extends SoftDeleteFields {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  telefonoWhatsapp?: string;
  dui?: string;
  fechaNacimiento?: Date;
  contactoEmergenciaNombre: string;
  contactoEmergenciaRelacionId?: string;
  contactoEmergenciaRelacion: string;
  contactoEmergenciaTel: string;
  nivelExperienciaId?: string;
  nivelExperiencia: string;
  restriccionesMedicas?: string;
  notasInternas?: string;
  activo: boolean;
  creadoEn: Date;
  creadoPor: string;
  searchPrefixes?: string[];
}
