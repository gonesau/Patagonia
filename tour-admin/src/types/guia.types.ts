import type { SoftDeleteFields } from "./softDelete.types";

export interface Guia extends SoftDeleteFields {
  id: string;
  nombre: string;
  apellido: string;
  dui: string;
  email: string;
  telefono: string;
  especialidad?: string;
  estadoId?: string;
  estado: string;
  activo?: boolean;
  grupoSanguineo?: string;
  alergias?: string;
  condicionesMedicas?: string;
  contactoEmergenciaNombre: string;
  contactoEmergenciaTel: string;
  creadoEn: Date;
}
