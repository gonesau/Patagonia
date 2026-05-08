import { useState } from "react";
import { ExternalLink, FolderPlus, ImageIcon, Mail } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { notificacionesService } from "@/services/notificacionesService";
import { notificacionesFirestoreService } from "@/services/notificacionesFirestoreService";
import { toServiceErrorMessage } from "@/services/serviceErrors";
import type { NotificacionRegistro } from "@/types/notificacion.types";

interface TourOperacionesPanelProps {
  tourId: string;
  driveFolderUrl?: string;
  onDriveFolderCreated: (url: string) => void;
  onReloadTour: () => Promise<void>;
}

export function TourOperacionesPanel({
  tourId,
  driveFolderUrl,
  onDriveFolderCreated,
  onReloadTour,
}: TourOperacionesPanelProps) {
  const [historial, setHistorial] = useState<NotificacionRegistro[]>([]);
  const [isLoadingHistorial, setIsLoadingHistorial] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [photosOpen, setPhotosOpen] = useState(false);
  const [reminderBody, setReminderBody] = useState(
    "Mensaje de recordatorio: revisa el punto de encuentro y la hora de salida.",
  );
  const [photosBody, setPhotosBody] = useState("Aquí tienes el enlace a las fotografías del tour.");
  const [isSending, setIsSending] = useState(false);

  const loadHistorial = async () => {
    setIsLoadingHistorial(true);
    try {
      setHistorial(await notificacionesFirestoreService.listByTour(tourId));
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    } finally {
      setIsLoadingHistorial(false);
    }
  };

  const handleCreateDrive = async () => {
    setIsCreatingFolder(true);
    setErrorMessage(null);
    try {
      const result = await notificacionesService.createDriveFolder(tourId);
      onDriveFolderCreated(result.url);
      await onReloadTour();
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleSendReminder = async () => {
    setIsSending(true);
    setErrorMessage(null);
    try {
      await notificacionesService.sendManualReminder(tourId, reminderBody);
      setReminderOpen(false);
      await loadHistorial();
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    } finally {
      setIsSending(false);
    }
  };

  const handleSendPhotos = async () => {
    setIsSending(true);
    setErrorMessage(null);
    try {
      await notificacionesService.sendPhotosLink(tourId, photosBody);
      setPhotosOpen(false);
      await loadHistorial();
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <Card>
        <h3 className="mb-3 font-heading text-lg">Operaciones y comunicaciones</h3>
        {errorMessage ? <p className="mb-2 text-sm text-danger">{errorMessage}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button
            className="inline-flex items-center gap-2"
            variant="secondary"
            type="button"
            disabled={isCreatingFolder}
            onClick={() => void handleCreateDrive()}
          >
            <FolderPlus size={16} strokeWidth={1.8} />
            {isCreatingFolder ? "Creando..." : "Carpeta Drive"}
          </Button>
          {driveFolderUrl ? (
            <a
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary underline"
              href={driveFolderUrl}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink size={14} strokeWidth={1.8} />
              Abrir carpeta
            </a>
          ) : null}
          <Button
            className="inline-flex items-center gap-2"
            variant="secondary"
            type="button"
            onClick={() => {
              setReminderOpen(true);
              void loadHistorial();
            }}
          >
            <Mail size={16} strokeWidth={1.8} />
            Recordatorio manual
          </Button>
          <Button
            className="inline-flex items-center gap-2"
            variant="secondary"
            type="button"
            onClick={() => {
              setPhotosOpen(true);
              void loadHistorial();
            }}
          >
            <ImageIcon size={16} strokeWidth={1.8} />
            Email fotos
          </Button>
          <Button className="inline-flex items-center gap-2" variant="ghost" type="button" onClick={() => void loadHistorial()}>
            {isLoadingHistorial ? "Cargando historial..." : "Ver historial envíos"}
          </Button>
        </div>
        {historial.length > 0 ? (
          <ul className="mt-3 max-h-40 overflow-y-auto text-xs text-neutral">
            {historial.map((item) => (
              <li key={item.id}>
                {item.tipo} — {item.estado}{" "}
                {item.enviadaEn ? new Date(item.enviadaEn).toLocaleString("es-SV") : ""}
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      <Modal isOpen={reminderOpen} onClose={() => setReminderOpen(false)} size="md" title="Enviar recordatorio manual">
        <label className="mb-2 flex flex-col gap-1 text-sm">
          <span>Mensaje (HTML simple)</span>
          <textarea
            className="min-h-28 rounded-md border border-border px-3 py-2"
            value={reminderBody}
            onChange={(event) => setReminderBody(event.target.value)}
          />
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setReminderOpen(false)}>
            Cancelar
          </Button>
          <Button type="button" disabled={isSending} onClick={() => void handleSendReminder()}>
            {isSending ? "Enviando..." : "Enviar"}
          </Button>
        </div>
      </Modal>

      <Modal isOpen={photosOpen} onClose={() => setPhotosOpen(false)} size="md" title="Enviar enlace de fotografías">
        <p className="mb-2 text-sm text-neutral">Se adjuntará el enlace de la carpeta Drive si existe.</p>
        <label className="mb-2 flex flex-col gap-1 text-sm">
          <span>Mensaje</span>
          <textarea
            className="min-h-24 rounded-md border border-border px-3 py-2"
            value={photosBody}
            onChange={(event) => setPhotosBody(event.target.value)}
          />
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setPhotosOpen(false)}>
            Cancelar
          </Button>
          <Button type="button" disabled={isSending} onClick={() => void handleSendPhotos()}>
            {isSending ? "Enviando..." : "Enviar"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
