export interface Transporte {
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
  tipoCombustible?: string;
  costoPorTour: number;
  seguroPoliza?: string;
  seguroVence?: Date;
  activo: boolean;
  creadoEn?: Date;
}
