import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import type { MetodoPagoCatalogo } from "@/types/metodoPago.types";
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

interface PagosPanelProps {
  inscripciones: Inscripcion[];
  pagos: Pago[];
  paymentInscripcionId: string;
  paymentAmount: number;
  paymentMethodId: string;
  paymentMethods: MetodoPagoCatalogo[];
  isSubmitting: boolean;
  isReadOnly: boolean;
  onSelectInscripcion: (inscripcionId: string) => void;
  onAmountChange: (amount: number) => void;
  onSelectMethod: (methodId: string) => void;
  onSubmit: (payload: { comprobante?: File | null }) => void;
}

export function PagosPanel({
  inscripciones,
  pagos,
  paymentInscripcionId,
  paymentAmount,
  paymentMethodId,
  paymentMethods,
  isSubmitting,
  isReadOnly,
  onSelectInscripcion,
  onAmountChange,
  onSelectMethod,
  onSubmit,
}: PagosPanelProps) {
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);

  const paymentRows = pagos.map((pago) => [
    pago.inscripcionId.slice(0, 8),
    `$${pago.monto.toFixed(2)}`,
    pago.metodoPago,
    new Date(pago.fecha).toLocaleDateString("es-SV"),
  ]);

  const resumen = useMemo(() => {
    let completo = 0;
    let parcial = 0;
    let sinPagar = 0;
    let recaudado = 0;
    let pendiente = 0;
    for (const ins of inscripciones) {
      if (ins.estado === "cancelado") {
        continue;
      }
      recaudado += ins.montoPagado;
      pendiente += Math.max(0, ins.montoTotal - ins.montoPagado);
      if (ins.estadoPago === "completo") {
        completo += 1;
      } else if (ins.estadoPago === "parcial") {
        parcial += 1;
      } else {
        sinPagar += 1;
      }
    }
    const activas = inscripciones.filter((i) => i.estado !== "cancelado").length;
    return { completo, parcial, sinPagar, recaudado, pendiente, activas };
  }, [inscripciones]);

  const metodoPorInscripcion = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of pagos) {
      const prev = map.get(p.inscripcionId);
      map.set(p.inscripcionId, prev ? `${prev}, ${p.metodoPago}` : p.metodoPago);
    }
    return map;
  }, [pagos]);

  return (
    <>
      <Card>
        <h3 className="mb-2 font-heading text-lg">Registrar pago</h3>
        {isReadOnly ? (
          <p className="text-sm text-neutral">Solo lectura: tu rol no puede registrar pagos.</p>
        ) : (
          <>
            <label className="mb-2 flex flex-col gap-1 text-sm">
              <span>Inscripción</span>
              <select
                className="rounded-md border border-border px-3 py-2"
                value={paymentInscripcionId}
                onChange={(event) => onSelectInscripcion(event.target.value)}
                disabled={isSubmitting}
              >
                <option value="">Selecciona</option>
                {inscripciones.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.vagoNombre}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label="Monto"
              type="number"
              value={paymentAmount}
              disabled={isSubmitting}
              onChange={(event) => onAmountChange(Number(event.target.value))}
            />
            <label className="mt-2 flex flex-col gap-1 text-sm">
              <span>Método de pago</span>
              <select
                className="rounded-md border border-border px-3 py-2"
                value={paymentMethodId}
                onChange={(event) => onSelectMethod(event.target.value)}
                disabled={isSubmitting}
              >
                <option value="">Selecciona</option>
                {paymentMethods.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-2 flex flex-col gap-1 text-sm">
              <span>Comprobante (opcional)</span>
              <input
                accept="image/*,.pdf,application/pdf"
                className="text-sm"
                disabled={isSubmitting}
                type="file"
                onChange={(event) => setComprobanteFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <Button
              className="mt-2 w-full"
              onClick={() => {
                onSubmit({ comprobante: comprobanteFile });
                setComprobanteFile(null);
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Registrando..." : "Registrar pago"}
            </Button>
          </>
        )}
      </Card>
      <div className="xl:col-span-3">
        <Card>
          <h3 className="mb-3 font-heading text-lg">Estado de pagos</h3>
          <Table
            headers={["Vago", "Teléfono", "Total", "Pagado", "Saldo", "Método", "Estado"]}
            rows={inscripciones
              .filter((item) => item.estado !== "cancelado")
              .map((item) => {
                const saldo = Math.max(0, item.montoTotal - item.montoPagado);
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
                      {item.estadoPago}
                    </span>,
                  ],
                };
              })}
          />
          <div className="mt-4 rounded-md bg-primary/5 p-3 text-sm">
            <p className="font-semibold">Totales</p>
            <p>Inscritos activos: {resumen.activas}</p>
            <p>Pagado completo: {resumen.completo}</p>
            <p>Pago parcial: {resumen.parcial}</p>
            <p>Sin pagar: {resumen.sinPagar}</p>
            <p className="font-mono">Monto recaudado: ${resumen.recaudado.toFixed(2)}</p>
            <p className="font-mono">Monto pendiente: ${resumen.pendiente.toFixed(2)}</p>
          </div>
          <div className="mt-4">
            <h4 className="mb-2 font-heading">Historial de pagos</h4>
            <Table headers={["Inscripción", "Monto", "Método", "Fecha"]} rows={paymentRows} />
          </div>
        </Card>
      </div>
    </>
  );
}
