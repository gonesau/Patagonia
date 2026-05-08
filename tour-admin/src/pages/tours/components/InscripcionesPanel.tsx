import { UserPlus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { Vago } from "@/types/vago.types";

interface InscripcionesPanelProps {
  vagos: Vago[];
  selectedVagoId: string;
  inscripcionMontoTotal: number;
  isSubmitting: boolean;
  onSelectVago: (vagoId: string) => void;
  onAmountChange: (amount: number) => void;
  onSubmit: () => void;
}

export function InscripcionesPanel({
  vagos,
  selectedVagoId,
  inscripcionMontoTotal,
  isSubmitting,
  onSelectVago,
  onAmountChange,
  onSubmit,
}: InscripcionesPanelProps) {
  return (
    <Card>
      <h3 className="mb-2 flex items-center gap-2 font-heading text-lg">
        <UserPlus size={17} strokeWidth={1.8} />
        Inscribir Vago
      </h3>
      <label className="mb-2 flex flex-col gap-1 text-sm">
        <span>Vago</span>
        <select
          className="rounded-md border border-border px-3 py-2"
          value={selectedVagoId}
          onChange={(event) => onSelectVago(event.target.value)}
          disabled={isSubmitting}
        >
          <option value="">Selecciona</option>
          {vagos.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nombre} {item.apellido}
            </option>
          ))}
        </select>
      </label>
      <Input
        label="Monto acordado"
        type="number"
        value={inscripcionMontoTotal}
        disabled={isSubmitting}
        onChange={(event) => onAmountChange(Number(event.target.value))}
      />
      <Button className="mt-2 w-full" onClick={onSubmit} disabled={isSubmitting}>
        {isSubmitting ? "Inscribiendo..." : "Inscribir"}
      </Button>
    </Card>
  );
}
