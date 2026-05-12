import { useMemo } from "react";
import { CircleDollarSign } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import type { Inscripcion } from "@/types/inscripcion.types";
import type { Pago } from "@/types/pago.types";

function estadoPagoBadgeClass(estado: Inscripcion["estadoPago"]): string {
  if (estado === "completo") {
    return "bg-emerald-100 text-emerald-900";
  }
  if (estado === "parcial") {
    return "bg-amber-100 text-amber-900";
  }
  return "bg-red-100 text-red-900";
}

function estadoPagoLabel(estado: Inscripcion["estadoPago"]): string {
  if (estado === "completo") {
    return "Pago Completado";
  }
  if (estado === "parcial") {
    return "Pago Parcial";
  }
  return "Pago Pendiente";
}

interface PagosPanelProps {
  inscripciones: Inscripcion[];
  pagos: Pago[];
  isReadOnly: boolean;
  onRegistrarPago: (inscripcion: Inscripcion) => void;
}

export function PagosPanel({ inscripciones, pagos, isReadOnly, onRegistrarPago }: PagosPanelProps) {
  const paymentRows = useMemo(
    () =>
      pagos
        .slice()
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
        .map((pago) => [
          pago.inscripcionId.slice(0, 8),
          `$${pago.monto.toFixed(2)}`,
          pago.metodoPago,
          new Date(pago.fecha).toLocaleDateString("es-SV"),
        ]),
    [pagos],
  );

  const metodoPorInscripcion = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of pagos) {
      const prev = map.get(p.inscripcionId);
      map.set(p.inscripcionId, prev ? `${prev}, ${p.metodoPago}` : p.metodoPago);
    }
    return map;
  }, [pagos]);

  const activas = useMemo(
    () => inscripciones.filter((item) => item.estado !== "cancelado"),
    [inscripciones],
  );

  return (
    <Card>
      <h3 className="mb-3 flex items-center gap-2 font-heading text-lg">
        <CircleDollarSign size={18} strokeWidth={1.8} />
        Estado de pagos
      </h3>
      {isReadOnly ? (
        <p className="mb-3 text-sm text-neutral">
          Solo lectura: tu rol no puede registrar pagos. Para ver totales financieros, abrí el módulo de Reportes.
        </p>
      ) : (
        <p className="mb-3 text-sm text-neutral">
          Los totales financieros consolidados se muestran en el módulo de Reportes.
        </p>
      )}

      <Table
        emptyMessage="Aún no hay vagos inscritos en este tour."
        headers={["Vago", "Teléfono", "Total", "Pagado", "Saldo", "Método", "Estado", "Acciones"]}
        rows={activas.map((item) => {
          const saldo = Math.max(0, item.montoTotal - item.montoPagado);
          const hasSaldo = saldo > 0.01;
          return {
            key: item.id,
            cells: [
              item.vagoNombre,
              item.vagoTelefono,
              `$${item.montoTotal.toFixed(2)}`,
              `$${item.montoPagado.toFixed(2)}`,
              `$${saldo.toFixed(2)}`,
              metodoPorInscripcion.get(item.id) ?? "—",
              <span
                key={`estado-${item.id}`}
                className={`rounded px-2 py-0.5 text-xs font-semibold ${estadoPagoBadgeClass(item.estadoPago)}`}
              >
                {estadoPagoLabel(item.estadoPago)}
              </span>,
              <Button
                key={`pago-${item.id}`}
                className="px-3 py-1 text-xs"
                disabled={isReadOnly || !hasSaldo}
                onClick={() => onRegistrarPago(item)}
                type="button"
                variant="secondary"
              >
                {hasSaldo ? "Registrar pago" : "Pagado"}
              </Button>,
            ],
          };
        })}
      />

      <div className="mt-5">
        <h4 className="mb-2 font-heading text-base">Historial de pagos</h4>
        <Table
          emptyMessage="Aún no hay pagos registrados."
          headers={["Inscripción", "Monto", "Método", "Fecha"]}
          rows={paymentRows}
        />
      </div>
    </Card>
  );
}
