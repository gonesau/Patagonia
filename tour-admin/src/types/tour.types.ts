export interface TourPlantilla {
  id: string;
  nombre: string;
  descripcion: string;
  distanciaKm?: number;
  elevacionM?: number;
  dificultad: "muy_facil" | "facil" | "moderado" | "dificil" | "muy_dificil";
  wikiloc?: string;
  equipoRecomendado?: string;
  itinerarioTipo?: string;
  serviciosExtras?: string;
  politicaCancelacion?: string;
  precioBase: number;
  activa: boolean;
  creadoEn: Date;
  creadoPor: string;
}

export interface TourOcurrencia {
  id: string;
  plantillaId: string;
  nombre: string;
  estado: "borrador" | "publicado" | "lleno" | "en_curso" | "realizado" | "cancelado";
  guiaId: string;
  fechaInicio: Date;
  fechaFin: Date;
  transporteId?: string;
  cupoMaximo: number;
  cupoMinimo: number;
  precioVenta: number;
  puntoEncuentro: string;
  costoTransporte?: number;
  costosExtras?: number;
  driveFolderUrl?: string;
  driveFolderId?: string;
  recordatorio7dEnviado: boolean;
  recordatorio1dEnviado: boolean;
  creadoEn: Date;
  creadoPor: string;
  actualizadoEn: Date;
}
