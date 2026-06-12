import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { DataCard } from "@/components/ui/DataCard";
import { Table, type TableRow } from "@/components/ui/Table";
import { useAuth } from "@/hooks/useAuth";
import {
  SOFT_DELETE_FIELD,
  softDeleteService,
  type InactiveRecord,
  type SoftDeletableCollection,
} from "@/services/softDeleteService";
import { toServiceErrorMessage } from "@/services/serviceErrors";

interface EntityOption {
  collection: SoftDeletableCollection;
  label: string;
}

const ENTITY_OPTIONS: readonly EntityOption[] = [
  { collection: "vagos", label: "Vagos" },
  { collection: "guias", label: "Guías" },
  { collection: "tour_plantillas", label: "Plantillas de tour" },
  { collection: "tours", label: "Tours" },
  { collection: "transporte", label: "Transporte" },
  { collection: "terrenos", label: "Terrenos" },
  { collection: "usuarios_sistema", label: "Usuarios del sistema" },
  { collection: "categoriasCompra", label: "Categorías de compra" },
  { collection: "tiposVehiculo", label: "Tipos de vehículo" },
  { collection: "relacionesEmergencia", label: "Relaciones de emergencia" },
  { collection: "metodosPago", label: "Métodos de pago" },
  { collection: "estadosGuia", label: "Estados de guía" },
  { collection: "nivelesExperiencia", label: "Niveles de experiencia" },
];

type PendingAction =
  | { type: "restore"; record: InactiveRecord }
  | { type: "permanent"; record: InactiveRecord }
  | null;

function formatDate(value: Date | undefined): string {
  if (!value) {
    return "—";
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleString("es-SV");
}

export function InactiveRecordsSection() {
  const { profile } = useAuth();
  const [selectedCollection, setSelectedCollection] = useState<SoftDeletableCollection>(
    ENTITY_OPTIONS[0].collection,
  );
  const [records, setRecords] = useState<InactiveRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const auditContext = useMemo(
    () => ({
      usuarioId: profile?.id ?? "sistema",
      usuarioEmail: profile?.email ?? "",
    }),
    [profile?.id, profile?.email],
  );

  const loadRecords = async (collectionName: SoftDeletableCollection) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const data = await softDeleteService.listInactive(collectionName);
      setRecords(data);
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRecords(selectedCollection);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selectedCollection]);

  const handleConfirm = async () => {
    if (!pendingAction) {
      return;
    }
    try {
      setIsProcessing(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      if (pendingAction.type === "restore") {
        await softDeleteService.restore(selectedCollection, pendingAction.record.id, auditContext);
        setSuccessMessage(`Registro "${pendingAction.record.nombre}" reactivado.`);
      } else {
        await softDeleteService.permanentDelete(
          selectedCollection,
          pendingAction.record.id,
          auditContext,
        );
        setSuccessMessage(`Registro "${pendingAction.record.nombre}" eliminado definitivamente.`);
      }
      setPendingAction(null);
      await loadRecords(selectedCollection);
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <h2 className="mb-2 font-heading text-lg text-textDark">Registros inactivos</h2>
      <p className="mb-4 text-sm text-neutral">
        Consulta los registros marcados como inactivos. Puedes reactivarlos o eliminarlos definitivamente
        (se conservará el log para auditoría aunque ya no se muestren en este listado).
      </p>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <label className="flex flex-col gap-1 text-sm text-textDark sm:max-w-xs">
          <span>Entidad</span>
          <select
            className="rounded-md border border-border bg-white px-3 py-2"
            value={selectedCollection}
            onChange={(event) => setSelectedCollection(event.target.value as SoftDeletableCollection)}
            disabled={isLoading || isProcessing}
          >
            {ENTITY_OPTIONS.map((option) => (
              <option key={option.collection} value={option.collection}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <Button
          variant="secondary"
          disabled={isLoading || isProcessing}
          onClick={() => void loadRecords(selectedCollection)}
        >
          Recargar
        </Button>
      </div>
      {errorMessage ? <p className="mb-3 text-sm text-danger">{errorMessage}</p> : null}
      {successMessage ? <p className="mb-3 text-sm text-success">{successMessage}</p> : null}
      {isLoading ? <p className="text-sm text-neutral">Cargando registros inactivos…</p> : null}
      {!isLoading && records.length === 0 ? (
        <p className="text-sm text-neutral">No hay registros inactivos en esta entidad.</p>
      ) : null}
      {!isLoading && records.length > 0 ? (
        <div className="max-h-[520px] overflow-y-auto">
          <Table
            emptyMessage="No hay registros inactivos en esta entidad."
            headers={["Identificador", "Descripción", "Fecha de inactivación", "Eliminado por", "Acciones"]}
            renderMobileCard={(row: TableRow) => {
              const record = records.find((item) => item.id === row.key);
              if (!record) {
                return null;
              }
              return (
                <DataCard
                  key={record.id}
                  title={record.nombre}
                  fields={[
                    { label: "Descripción", value: record.descripcion ?? "—" },
                    { label: "Fecha de inactivación", value: formatDate(record.eliminadoEn) },
                    { label: "Eliminado por", value: record.eliminadoPor ?? "—" },
                  ]}
                  actions={
                    <div className="flex w-full flex-col gap-2">
                      <Button
                        className="min-h-11 w-full"
                        variant="secondary"
                        disabled={isProcessing}
                        onClick={() => setPendingAction({ type: "restore", record })}
                      >
                        Reactivar
                      </Button>
                      <Button
                        className="min-h-11 w-full"
                        variant="danger"
                        disabled={isProcessing}
                        onClick={() => setPendingAction({ type: "permanent", record })}
                      >
                        Eliminar definitivamente
                      </Button>
                    </div>
                  }
                />
              );
            }}
            rows={records.map((record) => ({
              key: record.id,
              cells: [
                record.nombre,
                record.descripcion ?? "—",
                <span key={`fecha-${record.id}`} className="font-mono text-xs">
                  {formatDate(record.eliminadoEn)}
                </span>,
                <span key={`por-${record.id}`} className="font-mono text-xs text-neutral">
                  {record.eliminadoPor ?? "—"}
                </span>,
                <div key={`actions-${record.id}`} className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    disabled={isProcessing}
                    onClick={() => setPendingAction({ type: "restore", record })}
                  >
                    Reactivar
                  </Button>
                  <Button
                    variant="danger"
                    disabled={isProcessing}
                    onClick={() => setPendingAction({ type: "permanent", record })}
                  >
                    Eliminar definitivamente
                  </Button>
                </div>,
              ],
            }))}
          />
        </div>
      ) : null}
      <Modal
        isOpen={Boolean(pendingAction)}
        onClose={() => (isProcessing ? undefined : setPendingAction(null))}
        title={pendingAction?.type === "restore" ? "Reactivar registro" : "Eliminar definitivamente"}
        footer={
          <>
            <Button
              variant="secondary"
              disabled={isProcessing}
              onClick={() => setPendingAction(null)}
            >
              Cancelar
            </Button>
            <Button
              variant={pendingAction?.type === "restore" ? "primary" : "danger"}
              disabled={isProcessing}
              onClick={() => void handleConfirm()}
            >
              {pendingAction?.type === "restore" ? "Reactivar" : "Eliminar definitivamente"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-textDark">
          {pendingAction?.type === "restore"
            ? `¿Confirmas reactivar "${pendingAction.record.nombre}"? Volverá a aparecer en el listado activo.`
            : pendingAction?.type === "permanent"
              ? `¿Confirmas eliminar definitivamente "${pendingAction.record.nombre}"? El registro se marcará como eliminado y dejará de aparecer en esta vista. La acción quedará registrada en el log de auditoría.`
              : ""}
        </p>
      </Modal>
      <p className="mt-3 text-xs text-neutral">
        Campo de estado utilizado: <span className="font-mono">{SOFT_DELETE_FIELD[selectedCollection]}</span>
      </p>
    </Card>
  );
}
