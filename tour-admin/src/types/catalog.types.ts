import type { SoftDeleteFields } from "./softDelete.types";

export interface CatalogItem extends SoftDeleteFields {
  id: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
  creadoEn: Date;
  actualizadoEn: Date;
}
