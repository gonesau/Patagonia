export function calculateTourMargin(
  ingresosRecibidos: number,
  costoTransporte: number,
  costoCompras: number,
  costosExtras: number,
  ingresosEsperados?: number,
) {
  const costoTotal = costoTransporte + costoCompras + costosExtras;
  const margenGanancia = ingresosRecibidos - costoTotal;
  const margenPorcentajeSobreCosto = costoTotal > 0 ? (margenGanancia / costoTotal) * 100 : 0;
  const baseIngresos = ingresosEsperados !== undefined && ingresosEsperados > 0 ? ingresosEsperados : ingresosRecibidos;
  const margenPorcentajeSobreIngresos = baseIngresos > 0 ? (margenGanancia / baseIngresos) * 100 : 0;

  return {
    costoTotal,
    margenGanancia,
    margenPorcentaje: margenPorcentajeSobreCosto,
    margenPorcentajeSobreIngresos,
  };
}
