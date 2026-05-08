import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import type { MetodoPagoCatalogo } from "@/types/metodoPago.types";
import type { Inscripcion } from "@/types/inscripcion.types";
import type { Pago } from "@/types/pago.types";

interface PagosPanelProps {
  inscripciones: Inscripcion[];
  pagos: Pago[];
  paymentInscripcionId: string;
  paymentAmount: number;
  paymentMethodId: string;
  paymentMethods: MetodoPagoCatalogo[];
  isSubmitting: boolean;
  onSelectInscripcion: (inscripcionId: string) => void;
  onAmountChange: (amount: number) => void;
  onSelectMethod: (methodId: string) => void;
  onSubmit: () => void;
}

export function PagosPanel({
  inscripciones,
  pagos,
  paymentInscripcionId,
  paymentAmount,
  paymentMethodId,
  paymentMethods,
  isSubmitting,
  onSelectInscripcion,
  onAmountChange,
  onSelectMethod,
  onSubmit,
}: PagosPanelProps) {
  const paymentRows = pagos.map((pago) => [
    pago.inscripcionId,
    `$${pago.monto.toFixed(2)}`,
    pago.metodoPago,
    new Date(pago.fecha).toLocaleDateString("es-SV"),
  ]);

  return (
    <>
      <Card>
        <h3 className="mb-2 font-heading text-lg">Registrar pago</h3>
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
        <Button className="mt-2 w-full" onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Registrando..." : "Registrar pago"}
        </Button>
      </Card>
      <div className="xl:col-span-3">
        <Card>
          <h3 className="mb-3 font-heading text-lg">Estado de pagos</h3>
          <Table
            headers={["Vago", "Total", "Pagado", "Estado"]}
            rows={inscripciones.map((item) => [
              item.vagoNombre,
              `$${item.montoTotal.toFixed(2)}`,
              `$${item.montoPagado.toFixed(2)}`,
              item.estadoPago,
            ])}
          />
          <div className="mt-4">
            <h4 className="mb-2 font-heading">Historial de pagos</h4>
            <Table headers={["Inscripción", "Monto", "Método", "Fecha"]} rows={paymentRows} />
          </div>
        </Card>
      </div>
    </>
  );
}
