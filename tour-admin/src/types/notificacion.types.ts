export interface Notificacion {
  id: string;
  tourId: string;
  tipo: "confirmacion" | "recordatorio_7d" | "recordatorio_1d" | "link_fotos" | "cancelacion" | "manual";
  estado: "programada" | "enviada" | "fallida";
  destinatarios: string[];
}
