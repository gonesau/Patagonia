export interface Compra {
  id: string;
  nombre: string;
  descripcion: string;
  categoriaId: string;
  categoriaNombreSnapshot: string;
  monto: number;
  fecha: Date;
  tourId: string | null;
  creadoEn?: Date;
  actualizadoEn?: Date;
}
