import { useCallback, useEffect, useState } from "react";
import { DatabaseBackup, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Table } from "@/components/ui/Table";
import { AlertMessage } from "@/components/ui/AlertMessage";
import { backupService, type BackupRecord, type BackupStatus } from "@/services/backupService";
import { toServiceErrorMessage } from "@/services/serviceErrors";

const RESTORE_KEYWORD = "RESTAURAR";

const STATUS_LABELS: Record<BackupStatus, string> = {
  pending: "En progreso",
  completed: "Completada",
  failed: "Fallida",
  unknown: "Desconocido",
};

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("es-SV");
}

export function BackupSection() {
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<BackupRecord | null>(null);
  const [restoreConfirmText, setRestoreConfirmText] = useState<string>("");
  const [restoreAcknowledged, setRestoreAcknowledged] = useState<boolean>(false);

  const loadBackups = useCallback(async () => {
    try {
      setErrorMessage(null);
      const items = await backupService.list();
      setBackups(items);
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const items = await backupService.list();
        if (active) {
          setBackups(items);
        }
      } catch (error) {
        if (active) {
          setErrorMessage(toServiceErrorMessage(error));
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const handleCreate = async () => {
    setIsCreating(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await backupService.create();
      setSuccessMessage("Copia de seguridad iniciada. La exportación puede tardar varios minutos.");
      await loadBackups();
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    } finally {
      setIsCreating(false);
    }
  };

  const handleRefreshStatus = async (backupId: string) => {
    try {
      await backupService.getStatus(backupId);
      await loadBackups();
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    }
  };

  const closeRestoreModal = () => {
    setRestoreTarget(null);
    setRestoreConfirmText("");
    setRestoreAcknowledged(false);
  };

  const handleRestore = async () => {
    if (!restoreTarget) {
      return;
    }
    setIsRestoring(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await backupService.restore(restoreTarget.id, restoreConfirmText.trim());
      setSuccessMessage("Restauración iniciada correctamente.");
      closeRestoreModal();
      await loadBackups();
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    } finally {
      setIsRestoring(false);
    }
  };

  const canConfirmRestore = restoreAcknowledged && restoreConfirmText.trim() === RESTORE_KEYWORD;

  return (
    <div className="mt-4">
      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-heading text-lg text-textDark">
              <DatabaseBackup size={20} strokeWidth={1.8} />
              Respaldo y restauración
            </h2>
            <p className="mt-1 text-sm text-neutral">
              Crea una copia de seguridad completa (base de datos y archivos) o restaura el sistema desde una copia
              previa. La restauración sobrescribe los datos actuales.
            </p>
          </div>
          <Button onClick={() => void handleCreate()} disabled={isCreating} className="inline-flex items-center gap-2">
            <DatabaseBackup size={16} strokeWidth={1.8} />
            {isCreating ? "Creando copia..." : "Crear copia de seguridad"}
          </Button>
        </div>

        {errorMessage ? <AlertMessage type="error" message={errorMessage} className="mb-3" /> : null}
        {successMessage ? <AlertMessage type="success" message={successMessage} className="mb-3" /> : null}

        {isLoading ? (
          <p className="text-sm text-neutral">Cargando copias de seguridad...</p>
        ) : (
          <Table
            emptyMessage="Aún no se han creado copias de seguridad."
            headers={["Fecha", "Creada por", "Estado", "Archivos", "Acciones"]}
            rows={backups.map((backup) => ({
              key: backup.id,
              cells: [
                formatDate(backup.createdAt),
                backup.createdByEmail ?? "—",
                STATUS_LABELS[backup.status] ?? backup.status,
                backup.storageFilesCopied ?? "—",
                <div className="flex flex-wrap items-center gap-2">
                  {backup.status === "pending" ? (
                    <Button
                      className="px-2 py-1 text-xs"
                      variant="secondary"
                      onClick={() => void handleRefreshStatus(backup.id)}
                    >
                      Actualizar estado
                    </Button>
                  ) : null}
                  {backup.status === "completed" ? (
                    <Button
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs"
                      variant="danger"
                      onClick={() => setRestoreTarget(backup)}
                    >
                      <RotateCcw size={14} strokeWidth={1.8} />
                      Restaurar
                    </Button>
                  ) : null}
                  {backup.status === "failed" && backup.errorMessage ? (
                    <span className="text-xs text-danger">{backup.errorMessage}</span>
                  ) : null}
                </div>,
              ],
            }))}
          />
        )}
      </Card>

      <Modal
        isOpen={Boolean(restoreTarget)}
        onClose={closeRestoreModal}
        size="md"
        title="Restaurar copia de seguridad"
      >
        <div className="space-y-4 text-sm text-textDark">
          <AlertMessage
            type="error"
            message="Esta acción sobrescribirá los datos actuales con el contenido de la copia seleccionada. No se puede deshacer."
          />
          <p>
            Copia seleccionada del <strong>{formatDate(restoreTarget?.createdAt ?? null)}</strong>.
          </p>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={restoreAcknowledged}
              onChange={(event) => setRestoreAcknowledged(event.target.checked)}
            />
            <span>Entiendo que esto sobrescribirá los datos actuales del sistema.</span>
          </label>
          <label className="flex flex-col gap-1">
            <span>
              Escribe <strong>{RESTORE_KEYWORD}</strong> para confirmar.
            </span>
            <input
              className="rounded-md border border-border px-3 py-2"
              value={restoreConfirmText}
              onChange={(event) => setRestoreConfirmText(event.target.value)}
              placeholder={RESTORE_KEYWORD}
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={closeRestoreModal}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={!canConfirmRestore || isRestoring}
              onClick={() => void handleRestore()}
            >
              {isRestoring ? "Restaurando..." : "Restaurar ahora"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
