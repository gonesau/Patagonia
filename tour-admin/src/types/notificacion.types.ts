export interface NotificacionRegistro {
  id: string;
  tourId: string;
  tipo: "confirmacion" | "recordatorio_7d" | "recordatorio_1d" | "link_fotos" | "cancelacion" | "manual";
  estado: "programada" | "enviada" | "fallida";
  destinatarios: string[];
  programadaPara?: Date;
  enviadaEn?: Date;
  error?: string;
}

/** @deprecated Use NotificacionRegistro */
export type Notificacion = NotificacionRegistro;
