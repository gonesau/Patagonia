import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Table, type TableRow } from "@/components/ui/Table";
import { TableActions } from "@/components/ui/TableActions";
import type { CatalogItem } from "@/types/catalog.types";

interface CatalogCrudSectionProps<T extends CatalogItem> {
  title: string;
  items: T[];
  isSubmitting: boolean;
  onCreate: (data: Pick<T, "nombre" | "descripcion">) => Promise<void>;
  onUpdate: (id: string, data: Partial<Pick<T, "nombre" | "descripcion" | "activo">>) => Promise<void>;
  onDeactivate: (id: string) => Promise<void>;
}

export function CatalogCrudSection<T extends CatalogItem>({
  title,
  items,
  isSubmitting,
  onCreate,
  onUpdate,
  onDeactivate,
}: CatalogCrudSectionProps<T>) {
  const [nombre, setNombre] = useState<string>("");
  const [descripcion, setDescripcion] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const resetForm = () => {
    setNombre("");
    setDescripcion("");
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!nombre.trim()) {
      return;
    }
    if (editingId) {
      await onUpdate(editingId, { nombre: nombre.trim(), descripcion: descripcion.trim() });
    } else {
      await onCreate({ nombre: nombre.trim(), descripcion: descripcion.trim() } as Pick<T, "nombre" | "descripcion">);
    }
    resetForm();
  };

  const rows: TableRow[] = items.map((item) => ({
    key: item.id,
    cells: [
      item.nombre,
      item.descripcion || "-",
      item.activo ? "Activo" : "Inactivo",
      <TableActions
        key={`${item.id}-actions`}
        onEdit={() => {
          setEditingId(item.id);
          setNombre(item.nombre);
          setDescripcion(item.descripcion);
        }}
        onDelete={() => void onDeactivate(item.id)}
      />,
    ],
  }));

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <Card>
        <h3 className="mb-2 font-heading text-lg">{title}</h3>
        <div className="grid gap-2">
          <Input label="Nombre" value={nombre} onChange={(event) => setNombre(event.target.value)} disabled={isSubmitting} />
          <label className="flex flex-col gap-1 text-sm text-textDark">
            <span>Descripción</span>
            <textarea
              className="rounded-md border border-border bg-white px-3 py-2 outline-none ring-primary focus:ring-2"
              value={descripcion}
              disabled={isSubmitting}
              onChange={(event) => setDescripcion(event.target.value)}
            />
          </label>
          <div className="flex gap-2">
            <Button className="w-full" disabled={isSubmitting} onClick={() => void handleSave()}>
              {isSubmitting ? "Guardando..." : editingId ? "Actualizar" : "Crear"}
            </Button>
            {editingId ? (
              <Button className="w-full" variant="ghost" disabled={isSubmitting} onClick={resetForm}>
                Cancelar
              </Button>
            ) : null}
          </div>
        </div>
      </Card>
      <div className="lg:col-span-2">
        <Card>
          <Table headers={["Nombre", "Descripción", "Estado", "Acciones"]} rows={rows} />
        </Card>
      </div>
    </div>
  );
}
