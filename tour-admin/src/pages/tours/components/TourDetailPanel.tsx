import { CircleDollarSign, ClipboardList, HandCoins, ReceiptText } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { TourOcurrencia } from "@/types/tour.types";

interface TourDetailPanelProps {
  selectedTour?: TourOcurrencia;
  ingresosRecibidos: number;
  costoTotal: number;
  margenGanancia: number;
}

export function TourDetailPanel({ selectedTour, ingresosRecibidos, costoTotal, margenGanancia }: TourDetailPanelProps) {
  return (
    <Card>
      <h3 className="mb-3 flex items-center gap-2 font-heading text-xl">
        <ClipboardList size={18} strokeWidth={1.8} />
        Resumen del tour seleccionado
      </h3>
      <p className="mb-3 text-sm text-neutral">
        {selectedTour ? selectedTour.nombre : "Selecciona un tour desde el listado para ver sus indicadores."}
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
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
            Costo total
          </p>
          <p className="font-mono text-lg">${costoTotal.toFixed(2)}</p>
        </Card>
        <Card>
          <p className="inline-flex items-center gap-1 text-xs text-neutral">
            <CircleDollarSign size={14} strokeWidth={1.8} />
            Margen
          </p>
          <p className={`font-mono text-lg ${margenGanancia >= 0 ? "text-success" : "text-danger"}`}>${margenGanancia.toFixed(2)}</p>
        </Card>
      </div>
    </Card>
  );
}
