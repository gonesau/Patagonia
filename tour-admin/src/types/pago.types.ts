export interface Pago {
  id: string;
  inscripcionId: string;
  tourId: string;
  vagoId: string;
  monto: number;
  metodoPago: "efectivo" | "transferencia" | "tarjeta" | "deposito" | "otro";
  fecha: Date;
}
