export interface Pago {
  id: string;
  inscripcionId: string;
  tourId: string;
  vagoId: string;
  monto: number;
  metodoPagoId?: string;
  metodoPago: string;
  fecha: Date;
  comprobanteUrl?: string;
  notas?: string;
  registradoPor: string;
  creadoEn?: Date;
}
