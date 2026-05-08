import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface ComprasPanelProps {
  comprasCount: number;
  isSubmitting: boolean;
  onSubmit: () => void;
}

export function ComprasPanel({ comprasCount, isSubmitting, onSubmit }: ComprasPanelProps) {
  return (
    <Card>
      <h3 className="mb-2 font-heading text-lg">Compras</h3>
      <Button className="w-full" onClick={onSubmit} disabled={isSubmitting}>
        {isSubmitting ? "Registrando..." : "Registrar compra"}
      </Button>
      <p className="mt-2 text-sm text-neutral">Compras registradas: {comprasCount}</p>
    </Card>
  );
}
