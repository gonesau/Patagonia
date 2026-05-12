import {
  AlertCircle,
  CheckCircle2,
  CircleDollarSign,
  CircleDot,
  ClipboardList,
  HandCoins,
  ReceiptText,
  Users,
  Wallet,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { TourOcurrencia } from "@/types/tour.types";

interface TourDetailPanelProps {
  selectedTour?: TourOcurrencia;
  inscripcionesActivas: number;
  cupoMaximo: number;
  ingresosEsperados: number;
  ingresosRecibidos: number;
  costoTransporte: number;
  costoCompras: number;
  costosExtras: number;
  costoTotal: number;
  margenGanancia: number;
  margenPorcentajeSobreIngresos: number;
  pagadoCompleto: number;
  pagoParcial: number;
  sinPagar: number;
  montoRecaudado: number;
  montoPendiente: number;
}

export function TourDetailPanel({
  selectedTour,
  inscripcionesActivas,
  cupoMaximo,
  ingresosEsperados,
  ingresosRecibidos,
  costoTransporte,
  costoCompras,
  costosExtras,
  costoTotal,
  margenGanancia,
  margenPorcentajeSobreIngresos,
  pagadoCompleto,
  pagoParcial,
  sinPagar,
  montoRecaudado,
  montoPendiente,
}: TourDetailPanelProps) {
  return (
    <Card>
      <h3 className="mb-3 flex items-center gap-2 font-heading text-xl">
        <ClipboardList size={18} strokeWidth={1.8} />
        Detalle y finanzas
      </h3>
      <p className="mb-3 text-sm text-neutral">
        {selectedTour ? selectedTour.nombre : "Selecciona un tour desde el listado para ver sus indicadores."}
      </p>
      {selectedTour ? (
        <div className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
          <p>
            <span className="text-neutral">Cupos:</span>{" "}
            <span className="font-mono font-semibold">
              {inscripcionesActivas} / {cupoMaximo}
            </span>
          </p>
          {selectedTour.wikiloc ? (
            <p>
              <span className="text-neutral">Wikiloc:</span>{" "}
              <a className="text-primary underline" href={selectedTour.wikiloc} rel="noreferrer" target="_blank">
                Abrir ruta
              </a>
            </p>
          ) : null}
          {selectedTour.equipoRecomendado ? (
            <p className="sm:col-span-2">
              <span className="text-neutral">Equipo:</span> {selectedTour.equipoRecomendado}
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <p className="inline-flex items-center gap-1 text-xs text-neutral">
            <Users size={14} strokeWidth={1.8} />
            Ingresos esperados
          </p>
          <p className="font-mono text-lg">${ingresosEsperados.toFixed(2)}</p>
        </Card>
        <Card>
          <p className="inline-flex items-center gap-1 text-xs text-neutral">
            <HandCoins size={14} strokeWidth={1.8} />
            Ingresos recibidos
          </p>
          <p className="font-mono text-lg">${ingresosRecibidos.toFixed(2)}</p>
        </Card>
        <Card>
          <p className="inline-flex items-center gap-1 text-xs text-neutral">
            <ReceiptText size={14} strokeWidth={1.8} />
            Costo transporte
          </p>
          <p className="font-mono text-lg">${costoTransporte.toFixed(2)}</p>
        </Card>
        <Card>
          <p className="inline-flex items-center gap-1 text-xs text-neutral">
            <ReceiptText size={14} strokeWidth={1.8} />
            Costo compras
          </p>
          <p className="font-mono text-lg">${costoCompras.toFixed(2)}</p>
        </Card>
        <Card>
          <p className="inline-flex items-center gap-1 text-xs text-neutral">
            <ReceiptText size={14} strokeWidth={1.8} />
            Otros costos
          </p>
          <p className="font-mono text-lg">${costosExtras.toFixed(2)}</p>
        </Card>
        <Card>
          <p className="inline-flex items-center gap-1 text-xs text-neutral">
            <ReceiptText size={14} strokeWidth={1.8} />
            Costo total
          </p>
          <p className="font-mono text-lg">${costoTotal.toFixed(2)}</p>
        </Card>
        <Card>
          <p className="inline-flex items-center gap-1 text-xs text-neutral">
            <CircleDollarSign size={14} strokeWidth={1.8} />
            Margen
          </p>
          <p className={`font-mono text-lg ${margenGanancia >= 0 ? "text-success" : "text-danger"}`}>
            ${margenGanancia.toFixed(2)}{" "}
            <span className="text-sm">
              ({margenPorcentajeSobreIngresos >= 0 ? "+" : ""}
              {margenPorcentajeSobreIngresos.toFixed(1)}% s/ ingresos)
            </span>
          </p>
        </Card>
      </div>

      {selectedTour ? (
        <section className="mt-5">
          <h4 className="mb-3 flex items-center gap-2 font-heading text-base text-textDark">
            <Wallet size={16} strokeWidth={1.8} />
            Resumen de pagos
          </h4>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <Card>
              <p className="inline-flex items-center gap-1 text-xs text-neutral">
                <Users size={14} strokeWidth={1.8} />
                Inscritos activos
              </p>
              <p className="font-mono text-lg">{inscripcionesActivas}</p>
            </Card>
            <Card>
              <p className="inline-flex items-center gap-1 text-xs text-neutral">
                <CheckCircle2 size={14} strokeWidth={1.8} />
                Pago completado
              </p>
              <p className="font-mono text-lg text-success">{pagadoCompleto}</p>
            </Card>
            <Card>
              <p className="inline-flex items-center gap-1 text-xs text-neutral">
                <CircleDot size={14} strokeWidth={1.8} />
                Pago parcial
              </p>
              <p className="font-mono text-lg text-warning">{pagoParcial}</p>
            </Card>
            <Card>
              <p className="inline-flex items-center gap-1 text-xs text-neutral">
                <AlertCircle size={14} strokeWidth={1.8} />
                Pago pendiente
              </p>
              <p className="font-mono text-lg text-danger">{sinPagar}</p>
            </Card>
            <Card>
              <p className="inline-flex items-center gap-1 text-xs text-neutral">
                <HandCoins size={14} strokeWidth={1.8} />
                Monto recaudado
              </p>
              <p className="font-mono text-lg text-success">${montoRecaudado.toFixed(2)}</p>
            </Card>
            <Card>
              <p className="inline-flex items-center gap-1 text-xs text-neutral">
                <ReceiptText size={14} strokeWidth={1.8} />
                Monto pendiente
              </p>
              <p className="font-mono text-lg text-danger">${montoPendiente.toFixed(2)}</p>
            </Card>
          </div>
        </section>
      ) : null}
    </Card>
  );
}
