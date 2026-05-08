import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Table, type TableRow } from "@/components/ui/Table";
import { TableActions } from "@/components/ui/TableActions";
import type { Compra } from "@/types/compra.types";
import type { CategoriaCompra } from "@/types/categoriaCompra.types";

interface ComprasPanelProps {
  /** Tour al que se asocia la compra cuando el usuario marca "asociar al tour". Vacío deshabilita esa opción. */
  associationTourId: string;
  comprasTour: Compra[];
  comprasGenerales: Compra[];
  categorias: CategoriaCompra[];
  isSubmitting: boolean;
  isReadOnly?: boolean;
  onCreate: (payload: Omit<Compra, "id" | "creadoEn" | "actualizadoEn">) => Promise<void>;
  onUpdate: (compraId: string, payload: Partial<Omit<Compra, "id" | "creadoEn" | "actualizadoEn">>) => Promise<void>;
  onDelete: (compraId: string) => Promise<void>;
}

interface CompraFormState {
  nombre: string;
  descripcion: string;
  categoriaId: string;
  monto: number;
  asociarAlTour: boolean;
}

const defaultFormState: CompraFormState = {
  nombre: "",
  descripcion: "",
  categoriaId: "",
  monto: 0,
  asociarAlTour: true,
};

function formatDate(value: Date): string {
  return new Date(value).toLocaleDateString("es-SV");
}

export function ComprasPanel({
  associationTourId,
  comprasTour,
  comprasGenerales,
  categorias,
  isSubmitting,
  isReadOnly = false,
  onCreate,
  onUpdate,
  onDelete,
}: ComprasPanelProps) {
  const [formState, setFormState] = useState<CompraFormState>(defaultFormState);
  const [editingCompraId, setEditingCompraId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const selectedCategoria = categorias.find((item) => item.id === formState.categoriaId);
  const isEditMode = Boolean(editingCompraId);

  const comprasTourRows: TableRow[] = comprasTour.map((item) => ({
    key: item.id,
    cells: isReadOnly
      ? [item.nombre, item.categoriaNombreSnapshot, `$${item.monto.toFixed(2)}`, formatDate(item.fecha)]
      : [
          item.nombre,
          item.categoriaNombreSnapshot,
          `$${item.monto.toFixed(2)}`,
          formatDate(item.fecha),
          <TableActions
            key={`${item.id}-actions`}
            onEdit={() => {
              setEditingCompraId(item.id);
              setFormState({
                nombre: item.nombre,
                descripcion: item.descripcion,
                categoriaId: item.categoriaId,
                monto: item.monto,
                asociarAlTour: Boolean(item.tourId),
              });
              setFormError(null);
            }}
            onDelete={() => void onDelete(item.id)}
          />,
        ],
  }));

  const resumenPorCategoria = useMemo(() => {
    const map = new Map<string, { count: number; subtotal: number }>();
    for (const item of comprasTour) {
      const key = item.categoriaNombreSnapshot || item.categoriaId;
      const prev = map.get(key) ?? { count: 0, subtotal: 0 };
      map.set(key, { count: prev.count + 1, subtotal: prev.subtotal + item.monto });
    }
    return Array.from(map.entries()).map(([categoria, data]) => ({ categoria, ...data }));
  }, [comprasTour]);

  const comprasGeneralesRows: TableRow[] = comprasGenerales.map((item) => ({
    key: item.id,
    cells: [item.nombre, item.categoriaNombreSnapshot, item.descripcion, `$${item.monto.toFixed(2)}`, formatDate(item.fecha)],
  }));

  const hasActiveCategories = categorias.length > 0;

  const handleFormReset = () => {
    setFormState(defaultFormState);
    setEditingCompraId(null);
    setFormError(null);
  };

  const handleSubmit = async () => {
    if (!formState.nombre.trim() || !formState.categoriaId || formState.monto <= 0) {
      setFormError("Completa nombre, categoría y monto válido.");
      return;
    }
    if (!selectedCategoria) {
      setFormError("Selecciona una categoría válida.");
      return;
    }

    if (formState.asociarAlTour && !associationTourId) {
      setFormError("Selecciona un tour arriba para asociar la compra.");
      return;
    }

    const payload = {
      nombre: formState.nombre.trim(),
      descripcion: formState.descripcion.trim(),
      categoriaId: selectedCategoria.id,
      categoriaNombreSnapshot: selectedCategoria.nombre,
      monto: formState.monto,
      fecha: new Date(),
      tourId: formState.asociarAlTour ? associationTourId : null,
    } satisfies Omit<Compra, "id" | "creadoEn" | "actualizadoEn">;

    if (editingCompraId) {
      await onUpdate(editingCompraId, payload);
    } else {
      await onCreate(payload);
    }
    handleFormReset();
  };

  return (
    <>
      {!isReadOnly ? (
      <Card>
        <h3 className="mb-2 font-heading text-lg">Compras del tour</h3>
        {!hasActiveCategories ? (
          <p className="rounded-md bg-warning/10 p-3 text-sm text-textDark">
            No hay categorías activas. Crea categorías en Administración para registrar compras.
          </p>
        ) : null}
        <div className="grid gap-2">
          <Input
            label="Nombre de la compra"
            value={formState.nombre}
            disabled={isSubmitting || !hasActiveCategories}
            onChange={(event) => setFormState((current) => ({ ...current, nombre: event.target.value }))}
          />
          <label className="flex flex-col gap-1 text-sm">
            <span>Categoría</span>
            <select
              className="rounded-md border border-border px-3 py-2"
              value={formState.categoriaId}
              disabled={isSubmitting || !hasActiveCategories}
              onChange={(event) => setFormState((current) => ({ ...current, categoriaId: event.target.value }))}
            >
              <option value="">Selecciona categoría</option>
              {categorias.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-textDark">
            <span>Descripción</span>
            <textarea
              className="rounded-md border border-border bg-white px-3 py-2 outline-none ring-primary focus:ring-2"
              value={formState.descripcion}
              disabled={isSubmitting || !hasActiveCategories}
              onChange={(event) => setFormState((current) => ({ ...current, descripcion: event.target.value }))}
            />
          </label>
          <Input
            label="Monto"
            type="number"
            min={0}
            value={formState.monto}
            disabled={isSubmitting || !hasActiveCategories}
            onChange={(event) => setFormState((current) => ({ ...current, monto: Number(event.target.value) }))}
          />
          <label className="flex items-center gap-2 text-sm text-textDark">
            <input
              type="checkbox"
              checked={formState.asociarAlTour}
              disabled={isSubmitting || !hasActiveCategories || !associationTourId}
              onChange={(event) => setFormState((current) => ({ ...current, asociarAlTour: event.target.checked }))}
            />
            Asociar esta compra al tour seleccionado
          </label>
          {!associationTourId ? (
            <p className="text-xs text-neutral">Elige un tour en el selector superior para poder asociar compras a una ocurrencia.</p>
          ) : null}
          {formError ? <p className="text-sm text-danger">{formError}</p> : null}
          <div className="flex gap-2">
            <Button className="w-full" onClick={() => void handleSubmit()} disabled={isSubmitting || !hasActiveCategories}>
              {isSubmitting ? "Guardando..." : isEditMode ? "Actualizar compra" : "Registrar compra"}
            </Button>
            {isEditMode ? (
              <Button variant="ghost" className="w-full" onClick={handleFormReset} disabled={isSubmitting}>
                Cancelar edición
              </Button>
            ) : null}
          </div>
        </div>
      </Card>
      ) : (
        <Card>
          <h3 className="mb-2 font-heading text-lg">Compras del tour</h3>
          <p className="text-sm text-neutral">Solo lectura: no puedes registrar compras con tu rol.</p>
        </Card>
      )}
      <div className="xl:col-span-2">
        <Card>
          <h4 className="mb-3 font-heading text-base">Compras asociadas al tour</h4>
          <Table
            headers={
              isReadOnly
                ? ["Nombre", "Categoría", "Monto", "Fecha"]
                : ["Nombre", "Categoría", "Monto", "Fecha", "Acciones"]
            }
            rows={comprasTourRows}
            emptyMessage="Aún no hay compras asociadas al tour."
          />
          {resumenPorCategoria.length > 0 ? (
            <div className="mt-4 rounded-md bg-primary/5 p-3 text-sm">
              <p className="mb-2 font-semibold">Resumen por categoría</p>
              <ul className="space-y-1">
                {resumenPorCategoria.map((row) => (
                  <li key={row.categoria}>
                    {row.categoria}: {row.count} ítem(s) — ${row.subtotal.toFixed(2)}
                  </li>
                ))}
              </ul>
              <p className="mt-2 font-mono font-semibold">
                Total: ${comprasTour.reduce((t, c) => t + c.monto, 0).toFixed(2)}
              </p>
            </div>
          ) : null}
          <h4 className="mb-3 mt-6 font-heading text-base">Compras generales (no asociadas a tour)</h4>
          <Table
            headers={["Nombre", "Categoría", "Descripción", "Monto", "Fecha"]}
            rows={comprasGeneralesRows}
            emptyMessage="No hay compras generales registradas."
          />
        </Card>
      </div>
    </>
  );
}
