export interface Compra {
  id: string;
  categoria: "snacks_alimentacion" | "equipo_hiking" | "primeros_auxilios" | "logistica" | "otro";
  descripcion: string;
  monto: number;
  fecha: Date;
}
