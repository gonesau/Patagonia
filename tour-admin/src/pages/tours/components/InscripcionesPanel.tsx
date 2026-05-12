import { useCallback, useMemo, useState } from "react";
import { UserPlus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Autocomplete, type AutocompleteOption } from "@/components/ui/Autocomplete";
import { AlertMessage } from "@/components/ui/AlertMessage";
import { vagosService } from "@/services/vagosService";
import type { Vago } from "@/types/vago.types";
import type { MetodoPagoCatalogo } from "@/types/metodoPago.types";

export interface InscripcionPanelSubmitPayload {
  vago: Vago;
  montoTotal: number;
  pagoInicial: {
    monto: number;
    metodoPagoId: string;
    metodoPagoNombre?: string;
    comprobante: File | null;
  } | null;
}

interface InscripcionesPanelProps {
  cuposDisponibles: number;
  isSubmitting: boolean;
  isReadOnly: boolean;
  paymentMethods: MetodoPagoCatalogo[];
  onSubmit: (payload: InscripcionPanelSubmitPayload) => Promise<boolean>;
}

function describeEstadoPago(anticipo: number, total: number): {
  label: string;
  badgeClass: string;
} {
  if (anticipo <= 0) {
    return { label: "Pago Pendiente", badgeClass: "bg-red-100 text-red-900" };
  }
  if (anticipo >= total) {
    return { label: "Pago Completado", badgeClass: "bg-emerald-100 text-emerald-900" };
  }
  return { label: "Pago Parcial", badgeClass: "bg-amber-100 text-amber-900" };
}

function vagoToOption(vago: Vago): AutocompleteOption {
  return {
    id: vago.id,
    label: `${vago.nombre} ${vago.apellido}`,
    sublabel: vago.email,
  };
}

export function InscripcionesPanel({
  cuposDisponibles,
  isSubmitting,
  isReadOnly,
  paymentMethods,
  onSubmit,
}: InscripcionesPanelProps) {
  const [selectedOption, setSelectedOption] = useState<AutocompleteOption | null>(null);
  const [selectedVago, setSelectedVago] = useState<Vago | null>(null);
  const [montoTotal, setMontoTotal] = useState<number>(0);
  const [anticipo, setAnticipo] = useState<number>(0);
  const [metodoPagoId, setMetodoPagoId] = useState<string>("");
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const loadVagoOptions = useCallback(async (query: string): Promise<AutocompleteOption[]> => {
    const page = await vagosService.listPage({ searchTerm: query, pageSize: 15 });
    return page.items.map(vagoToOption);
  }, []);

  const handleSelectVago = async (option: AutocompleteOption | null) => {
    setLocalError(null);
    setSelectedOption(option);
    if (!option) {
      setSelectedVago(null);
      return;
    }
    try {
      const page = await vagosService.listPage({ searchTerm: option.label, pageSize: 15 });
      const match = page.items.find((item) => item.id === option.id) ?? null;
      setSelectedVago(match);
    } catch {
      setLocalError("No fue posible cargar los datos del vago seleccionado.");
      setSelectedVago(null);
    }
  };

  const resetForm = () => {
    setSelectedOption(null);
    setSelectedVago(null);
    setMontoTotal(0);
    setAnticipo(0);
    setMetodoPagoId("");
    setComprobante(null);
    setLocalError(null);
  };

  const estadoPago = useMemo(
    () => describeEstadoPago(anticipo, montoTotal),
    [anticipo, montoTotal],
  );

  const tieneAnticipo = anticipo > 0;

  const handleSubmit = async () => {
    setLocalError(null);
    if (!selectedVago) {
      setLocalError("Buscá y seleccioná un vago para inscribir.");
      return;
    }
    if (!Number.isFinite(montoTotal) || montoTotal <= 0) {
      setLocalError("El monto acordado debe ser mayor a 0.");
      return;
    }
    if (tieneAnticipo && anticipo > montoTotal) {
      setLocalError("El anticipo no puede ser mayor al monto acordado.");
      return;
    }
    if (tieneAnticipo && !metodoPagoId) {
      setLocalError("Seleccioná un método de pago para el anticipo.");
      return;
    }
    const metodoSeleccionado = paymentMethods.find((item) => item.id === metodoPagoId);
    const payload: InscripcionPanelSubmitPayload = {
      vago: selectedVago,
      montoTotal,
      pagoInicial: tieneAnticipo
        ? {
            monto: anticipo,
            metodoPagoId,
            metodoPagoNombre: metodoSeleccionado?.nombre,
            comprobante,
          }
        : null,
    };
    const success = await onSubmit(payload);
    if (success) {
      resetForm();
    }
  };

  const disableForm = isSubmitting || isReadOnly || cuposDisponibles <= 0;

  return (
    <Card>
      <h3 className="mb-2 flex items-center gap-2 font-heading text-lg">
        <UserPlus size={17} strokeWidth={1.8} />
        Inscribir Vago
      </h3>
      <p className="mb-3 text-sm text-neutral">Cupos disponibles: {cuposDisponibles}</p>

      {isReadOnly ? (
        <p className="text-sm text-neutral">Solo lectura: tu rol no puede inscribir vagos.</p>
      ) : (
        <div className="flex flex-col gap-3">
          <Autocomplete
            disabled={disableForm}
            emptyMessage="No se encontraron vagos."
            label="Buscar vago (por nombre o email)"
            loadOptions={loadVagoOptions}
            minQueryLength={2}
            onSelect={handleSelectVago}
            placeholder="Escribí al menos 2 letras..."
            selected={selectedOption}
          />

          <Input
            disabled={disableForm}
            label="Monto acordado (USD)"
            min={0}
            onChange={(event) => setMontoTotal(Number(event.target.value))}
            step="0.01"
            type="number"
            value={montoTotal}
          />

          <div className="rounded-md border border-dashed border-border bg-surface p-3">
            <p className="mb-2 text-sm font-semibold text-textDark">
              Pago inicial (opcional)
            </p>
            <p className="mb-3 text-xs text-neutral">
              Dejá el monto en 0 para inscribir sin pago. El estado se calcula automáticamente.
            </p>

            <Input
              disabled={disableForm}
              label="Monto del anticipo (USD)"
              min={0}
              onChange={(event) => setAnticipo(Number(event.target.value))}
              step="0.01"
              type="number"
              value={anticipo}
            />

            {tieneAnticipo ? (
              <>
                <label className="mt-2 flex flex-col gap-1 text-sm">
                  <span className="font-medium">Método de pago</span>
                  <select
                    className="rounded-md border border-border bg-white px-3 py-2"
                    disabled={disableForm}
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

                <label className="mt-2 flex flex-col gap-1 text-sm">
                  <span className="font-medium">Comprobante (opcional)</span>
                  <input
                    accept="image/*,.pdf,application/pdf"
                    className="text-sm"
                    disabled={disableForm}
                    onChange={(event) => setComprobante(event.target.files?.[0] ?? null)}
                    type="file"
                  />
                </label>
              </>
            ) : null}
          </div>

          {montoTotal > 0 ? (
            <div className="flex items-center justify-between rounded-md bg-primary/5 px-3 py-2 text-sm">
              <span className="text-neutral">Estado al inscribir:</span>
              <span
                className={`rounded px-2 py-0.5 text-xs font-semibold ${estadoPago.badgeClass}`}
              >
                {estadoPago.label}
              </span>
            </div>
          ) : null}

          {localError ? <AlertMessage message={localError} type="error" /> : null}

          <Button
            className="w-full"
            disabled={disableForm}
            onClick={() => void handleSubmit()}
          >
            {isSubmitting ? "Inscribiendo..." : "Inscribir vago"}
          </Button>
        </div>
      )}
    </Card>
  );
}
