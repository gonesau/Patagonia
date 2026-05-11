import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Table, type TableRow } from "@/components/ui/Table";
import { TableActions } from "@/components/ui/TableActions";
import type { Terreno } from "@/types/terreno.types";

interface TerrenosCrudSectionProps {
  title: string;
  items: Terreno[];
  isSubmitting: boolean;
  onCreate: (data: Pick<Terreno, "nombre" | "descripcion" | "factor">) => Promise<void>;
  onUpdate: (
    id: string,
    data: Partial<Pick<Terreno, "nombre" | "descripcion" | "activo" | "factor">>,
  ) => Promise<void>;
  onDeactivate: (id: string) => Promise<void>;
  onSeedDefaults: () => Promise<number>;
}

const DEFAULT_FACTOR_INPUT = "1.0";
const MIN_FACTOR = 1.0;
const MAX_FACTOR = 2.0;

function parseFactorInput(raw: string): number | null {
  if (!raw.trim()) {
    return null;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < MIN_FACTOR || parsed > MAX_FACTOR) {
    return null;
  }
  return parsed;
}

export function TerrenosCrudSection({
  title,
  items,
  isSubmitting,
  onCreate,
  onUpdate,
  onDeactivate,
  onSeedDefaults,
}: TerrenosCrudSectionProps) {
  const [nombre, setNombre] = useState<string>("");
  const [descripcion, setDescripcion] = useState<string>("");
  const [factor, setFactor] = useState<string>(DEFAULT_FACTOR_INPUT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  const handleSeedDefaults = async () => {
    setSeedMessage(null);
    const created = await onSeedDefaults();
    setSeedMessage(
      created > 0
        ? `Se sembraron ${created} terrenos por defecto.`
        : "La colección ya tenía registros; no se creó ningún terreno.",
    );
  };

  const resetForm = () => {
    setNombre("");
    setDescripcion("");
    setFactor(DEFAULT_FACTOR_INPUT);
    setEditingId(null);
    setValidationError(null);
  };

  const handleSave = async () => {
    setValidationError(null);
    const trimmedNombre = nombre.trim();
    if (!trimmedNombre) {
      setValidationError("El nombre es obligatorio.");
      return;
    }
    const parsedFactor = parseFactorInput(factor);
    if (parsedFactor === null) {
      setValidationError(`El factor debe ser un número entre ${MIN_FACTOR.toFixed(1)} y ${MAX_FACTOR.toFixed(1)}.`);
      return;
    }
    const payload = { nombre: trimmedNombre, descripcion: descripcion.trim(), factor: parsedFactor };
    if (editingId) {
      await onUpdate(editingId, payload);
    } else {
      await onCreate(payload);
    }
    resetForm();
  };

  const rows: TableRow[] = items.map((item) => ({
    key: item.id,
    cells: [
      item.nombre,
      item.descripcion || "-",
      item.factor.toFixed(1),
      item.activo ? "Activo" : "Inactivo",
      <TableActions
        key={`${item.id}-actions`}
        onEdit={() => {
          setEditingId(item.id);
          setNombre(item.nombre);
          setDescripcion(item.descripcion);
          setFactor(item.factor.toFixed(1));
          setValidationError(null);
        }}
        onDelete={() => void onDeactivate(item.id)}
      />,
    ],
  }));

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      <div className="min-w-0">
        <Card>
          <h3 className="mb-2 font-heading text-lg">{title}</h3>
          <p className="mb-2 text-xs text-neutral">
            El factor multiplicador (entre {MIN_FACTOR.toFixed(1)} y {MAX_FACTOR.toFixed(1)}) determina cuánto incrementa el puntaje
            de dificultad al usar este terreno. Solo el terreno más exigente seleccionado en la plantilla aplica.
          </p>
          <div className="grid gap-2">
            <Input
              label="Nombre"
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              disabled={isSubmitting}
            />
            <label className="flex flex-col gap-1 text-sm text-textDark">
              <span>Descripción</span>
              <textarea
                className="rounded-md border border-border bg-white px-3 py-2 outline-none ring-primary focus:ring-2"
                value={descripcion}
                disabled={isSubmitting}
                onChange={(event) => setDescripcion(event.target.value)}
              />
            </label>
            <Input
              label="Factor multiplicador"
              type="number"
              step="0.1"
              min={MIN_FACTOR}
              max={MAX_FACTOR}
              value={factor}
              disabled={isSubmitting}
              onChange={(event) => setFactor(event.target.value)}
            />
            {validationError ? <p className="text-sm text-danger">{validationError}</p> : null}
            <div className="flex flex-col gap-2 sm:flex-row">
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
      </div>
      <div className="min-w-0 lg:col-span-2">
        <Card>
          {items.length === 0 ? (
            <div className="mb-3 rounded-md border border-dashed border-primary/40 bg-primary/5 p-3 text-sm">
              <p className="mb-2 text-textDark">
                No hay terrenos registrados. Puedes sembrar los 7 terrenos estandarizados (Pavimento, Tierra Compacta, Bosque con Raíces, Piedra Suelta, Lodo, Ceniza Volcánica, Roca Técnica) con sus factores oficiales.
              </p>
              <Button type="button" disabled={isSubmitting} onClick={() => void handleSeedDefaults()}>
                {isSubmitting ? "Sembrando..." : "Sembrar terrenos por defecto"}
              </Button>
            </div>
          ) : null}
          {seedMessage ? <p className="mb-3 text-sm text-success">{seedMessage}</p> : null}
          <Table headers={["Nombre", "Descripción", "Factor", "Estado", "Acciones"]} rows={rows} />
        </Card>
      </div>
    </div>
  );
}
