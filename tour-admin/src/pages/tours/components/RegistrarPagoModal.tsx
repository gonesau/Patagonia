import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AlertMessage } from "@/components/ui/AlertMessage";
import type { Inscripcion } from "@/types/inscripcion.types";
import type { MetodoPagoCatalogo } from "@/types/metodoPago.types";

export interface RegistrarPagoModalSubmitPayload {
  inscripcionId: string;
  monto: number;
  metodoPagoId: string;
  metodoPagoNombre?: string;
  comprobante: File | null;
  notas?: string;
}

interface RegistrarPagoModalProps {
  isOpen: boolean;
  inscripcion: Inscripcion | null;
  paymentMethods: MetodoPagoCatalogo[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: RegistrarPagoModalSubmitPayload) => Promise<boolean>;
}

export function RegistrarPagoModal({
  isOpen,
  inscripcion,
  paymentMethods,
  isSubmitting,
  onClose,
  onSubmit,
}: RegistrarPagoModalProps) {
  const saldo = useMemo(() => {
    if (!inscripcion) {
      return 0;
    }
    return Math.max(0, inscripcion.montoTotal - inscripcion.montoPagado);
  }, [inscripcion]);

  const [monto, setMonto] = useState<number>(0);
  const [metodoPagoId, setMetodoPagoId] = useState<string>("");
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [notas, setNotas] = useState<string>("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setMonto(saldo);
    setMetodoPagoId("");
    setComprobante(null);
    setNotas("");
    setLocalError(null);
  }, [isOpen, saldo]);

  if (!inscripcion) {
    return null;
  }

  const handleSubmit = async () => {
    setLocalError(null);
    if (!Number.isFinite(monto) || monto <= 0) {
      setLocalError("El monto del pago debe ser mayor a 0.");
      return;
    }
    if (monto > saldo) {
      setLocalError(`El monto no puede ser mayor al saldo pendiente ($${saldo.toFixed(2)}).`);
      return;
    }
    if (!metodoPagoId) {
      setLocalError("Seleccioná un método de pago.");
      return;
    }
    const metodoSeleccionado = paymentMethods.find((item) => item.id === metodoPagoId);
    const success = await onSubmit({
      inscripcionId: inscripcion.id,
      monto,
      metodoPagoId,
      metodoPagoNombre: metodoSeleccionado?.nombre,
      comprobante,
      notas: notas.trim() ? notas.trim() : undefined,
    });
    if (success) {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" title="Registrar pago">
      <div className="space-y-3">
        <section className="grid gap-2 rounded-md border border-border bg-surface px-4 py-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-neutral">Vago</p>
            <p className="font-semibold text-textDark">{inscripcion.vagoNombre}</p>
          </div>
          <div>
            <p className="text-neutral">Contacto</p>
            <p className="text-textDark">{inscripcion.vagoEmail}</p>
          </div>
          <div>
            <p className="text-neutral">Monto acordado</p>
            <p className="font-mono text-textDark">${inscripcion.montoTotal.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-neutral">Pagado</p>
            <p className="font-mono text-success">${inscripcion.montoPagado.toFixed(2)}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-neutral">Saldo pendiente</p>
            <p className="font-mono text-lg font-semibold text-danger">${saldo.toFixed(2)}</p>
          </div>
        </section>

        <Input
          disabled={isSubmitting}
          label="Monto del pago (USD)"
          min={0}
          onChange={(event) => setMonto(Number(event.target.value))}
          step="0.01"
          type="number"
          value={monto}
        />

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Método de pago</span>
          <select
            className="rounded-md border border-border bg-white px-3 py-2"
            disabled={isSubmitting}
            onChange={(event) => setMetodoPagoId(event.target.value)}
            value={metodoPagoId}
          >
            <option value="">Selecciona</option>
            {paymentMethods.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Comprobante (opcional)</span>
          <input
            accept="image/*,.pdf,application/pdf"
            className="text-sm"
            disabled={isSubmitting}
            onChange={(event) => setComprobante(event.target.files?.[0] ?? null)}
            type="file"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Notas (opcional)</span>
          <textarea
            className="min-h-[60px] rounded-md border border-border bg-white px-3 py-2 text-sm"
            disabled={isSubmitting}
            maxLength={200}
            onChange={(event) => setNotas(event.target.value)}
            value={notas}
          />
        </label>

        {localError ? <AlertMessage message={localError} type="error" /> : null}

        <div className="flex justify-end gap-2 pt-2">
          <Button disabled={isSubmitting} onClick={onClose} type="button" variant="ghost">
            Cancelar
          </Button>
          <Button disabled={isSubmitting || saldo <= 0} onClick={() => void handleSubmit()} type="button">
            {isSubmitting ? "Registrando..." : "Registrar pago"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
