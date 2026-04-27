export function calculateTourMargin(
  ingresosRecibidos: number,
  costoTransporte: number,
  costoCompras: number,
  costosExtras: number,
) {
  const costoTotal = costoTransporte + costoCompras + costosExtras;
  const margenGanancia = ingresosRecibidos - costoTotal;
  const margenPorcentaje = costoTotal > 0 ? (margenGanancia / costoTotal) * 100 : 0;

  return { costoTotal, margenGanancia, margenPorcentaje };
}
