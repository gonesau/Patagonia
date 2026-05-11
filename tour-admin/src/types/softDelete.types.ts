/**
 * Campos compartidos por todas las entidades sujetas a borrado lógico.
 * Permite distinguir entre "inactivo" (soft delete reversible) y
 * "eliminado definitivamente" (registro retirado del listado de inactivos
 * pero conservado para auditoría).
 */
export interface SoftDeleteFields {
  eliminadoDefinitivamente?: boolean;
  eliminadoEn?: Date;
  eliminadoPor?: string;
}
