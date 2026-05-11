import type { SoftDeleteFields } from "./softDelete.types";

export interface Transporte extends SoftDeleteFields {
  id: string;
  tipoVehiculoId?: string;
  tipoVehiculoNombreSnapshot?: string;
  empresa: string;
  motorista: string;
  telefonoMotorista?: string;
  marca: string;
  modelo: string;
  anio?: number;
  placa: string;
  capacidad: number;
  costoPorTour: number;
  activo: boolean;
  creadoEn?: Date;
}
