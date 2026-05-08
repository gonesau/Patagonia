import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface ComprasPanelProps {
  comprasCount: number;
  amount: number;
  isSubmitting: boolean;
  onAmountChange: (amount: number) => void;
  onSubmit: () => void;
}

export function ComprasPanel({ comprasCount, amount, isSubmitting, onAmountChange, onSubmit }: ComprasPanelProps) {
  return (
    <Card>
      <h3 className="mb-2 font-heading text-lg">Compras</h3>
      <Input
        label="Monto de compra"
        type="number"
        value={amount}
        disabled={isSubmitting}
        onChange={(event) => onAmountChange(Number(event.target.value))}
      />
      <Button className="w-full" onClick={onSubmit} disabled={isSubmitting}>
        {isSubmitting ? "Registrando..." : "Registrar compra"}
      </Button>
      <p className="mt-2 text-sm text-neutral">Compras registradas: {comprasCount}</p>
    </Card>
  );
}
