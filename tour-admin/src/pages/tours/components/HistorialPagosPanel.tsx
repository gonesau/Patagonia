import { useMemo } from "react";
import { CircleDollarSign } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import type { Pago } from "@/types/pago.types";
import type { Inscripcion } from "@/types/inscripcion.types";

interface HistorialPagosPanelProps {
  pagos: Pago[];
  inscripciones: Inscripcion[];
}

export function HistorialPagosPanel({ pagos, inscripciones }: HistorialPagosPanelProps) {
  const paymentRows = useMemo(
    () =>
      pagos
        .slice()
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
        .map((pago) => {
          const inscripcion = inscripciones.find((i) => i.id === pago.inscripcionId);
          return [
            inscripcion ? inscripcion.vagoNombre : pago.inscripcionId.slice(0, 8),
            `$${pago.monto.toFixed(2)}`,
            pago.metodoPago,
            new Date(pago.fecha).toLocaleDateString("es-SV"),
          ];
        }),
    [pagos, inscripciones],
  );

  return (
    <Card>
      <h3 className="mb-3 flex items-center gap-2 font-heading text-lg">
        <CircleDollarSign size={18} strokeWidth={1.8} />
        Historial de pagos
      </h3>
      <Table
        emptyMessage="Aún no hay pagos registrados."
        headers={["Vago", "Monto", "Método", "Fecha"]}
        rows={paymentRows}
      />
    </Card>
  );
}
