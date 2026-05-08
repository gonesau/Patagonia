export type TipoDocumentoGuia = "dui" | "primeros_auxilios" | "carnet_guia" | "certificacion" | "otro";

export interface GuiaDocumento {
  id: string;
  tipo: TipoDocumentoGuia;
  nombre: string;
  archivoUrl: string;
  venceEn?: Date;
  subidoEn: Date;
}
