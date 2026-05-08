export interface Guia {
  id: string;
  nombre: string;
  apellido: string;
  dui: string;
  email: string;
  telefono: string;
  especialidad?: string;
  estadoId?: string;
  estado: string;
  grupoSanguineo?: string;
  alergias?: string;
  condicionesMedicas?: string;
  contactoEmergenciaNombre: string;
  contactoEmergenciaTel: string;
  creadoEn: Date;
}
