export interface Inscripcion {
  id: string;
  vagoId: string;
  vagoNombre: string;
  vagoEmail: string;
  vagoTelefono: string;
  estado: "inscrito" | "confirmado" | "cancelado";
  montoTotal: number;
  montoPagado: number;
  estadoPago: "pendiente" | "parcial" | "completo";
}
