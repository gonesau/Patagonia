import { useMemo, useState } from "react";
import { Users, Mail, ImageIcon, FileDown, UserMinus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import type { Inscripcion } from "@/types/inscripcion.types";
import { notificacionesService } from "@/services/notificacionesService";
import { toServiceErrorMessage } from "@/services/serviceErrors";
import { AlertMessage } from "@/components/ui/AlertMessage";

function estadoPagoBadgeClass(estado: Inscripcion["estadoPago"]): string {
  if (estado === "completo") return "bg-emerald-100 text-emerald-900";
  if (estado === "parcial") return "bg-amber-100 text-amber-900";
  return "bg-red-100 text-red-900";
}

function estadoPagoLabel(estado: Inscripcion["estadoPago"]): string {
  if (estado === "completo") return "Completado";
  if (estado === "parcial") return "Parcial";
  return "Pendiente";
}

interface VagosInscritosPanelProps {
  tourId: string;
  inscripciones: Inscripcion[];
  isReadOnly: boolean;
  isExportingPdf: boolean;
  onRegistrarPago: (inscripcion: Inscripcion) => void;
  onDesinscribir: (inscripcionId: string) => Promise<void>;
  onExportarPdf: () => Promise<void>;
  onReloadTour: () => Promise<void>;
}

export function VagosInscritosPanel({
  tourId,
  inscripciones,
  isReadOnly,
  isExportingPdf,
  onRegistrarPago,
  onDesinscribir,
  onExportarPdf,
  onReloadTour,
}: VagosInscritosPanelProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [reminderOpen, setReminderOpen] = useState(false);
  const [photosOpen, setPhotosOpen] = useState(false);
  const [reminderBody, setReminderBody] = useState(
    "Mensaje de recordatorio: revisa el punto de encuentro y la hora de salida."
  );
  const [photosBody, setPhotosBody] = useState("Aquí tienes el enlace a las fotografías del tour.");
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activas = useMemo(
    () => inscripciones.filter((item) => item.estado !== "cancelado"),
    [inscripciones],
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(activas.map((i) => i.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const getSelectedIdsArray = () => Array.from(selectedIds);

  const handleSendReminder = async () => {
    setIsSending(true);
    setErrorMessage(null);
    try {
      await notificacionesService.sendManualReminder(tourId, reminderBody, getSelectedIdsArray());
      setReminderOpen(false);
      setSelectedIds(new Set());
      await onReloadTour();
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
      await notificacionesService.sendPhotosLink(tourId, photosBody, getSelectedIdsArray());
      setPhotosOpen(false);
      setSelectedIds(new Set());
      await onReloadTour();
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (item: Inscripcion) => {
    if (window.confirm(`¿Estás seguro de desinscribir a ${item.vagoNombre}?`)) {
      await onDesinscribir(item.id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  return (
    <Card>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="flex items-center gap-2 font-heading text-xl">
          <Users size={20} strokeWidth={1.8} />
          Vagos Inscritos
        </h3>
        {!isReadOnly && selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-md bg-primary/10 px-3 py-1.5 text-sm text-primary-dark">
            <span className="font-semibold">{selectedIds.size} seleccionados</span>
            <span className="mx-1 hidden sm:inline">|</span>
            <Button
              size="sm"
              variant="secondary"
              className="px-2 py-1 text-xs"
              onClick={() => setReminderOpen(true)}
            >
              <Mail size={14} className="mr-1" /> Enviar recordatorio
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="px-2 py-1 text-xs"
              onClick={() => setPhotosOpen(true)}
            >
              <ImageIcon size={14} className="mr-1" /> Enviar fotos
            </Button>
          </div>
        )}
      </div>

      {errorMessage && <AlertMessage type="error" message={errorMessage} className="mb-3" />}

      <Table
        emptyMessage="Aún no hay vagos inscritos en este tour."
        headers={[
          <input
            type="checkbox"
            checked={activas.length > 0 && selectedIds.size === activas.length}
            onChange={(e) => handleSelectAll(e.target.checked)}
            title="Seleccionar todos"
          />,
          "Nombre",
          "Teléfono",
          "Email",
          "Total",
          "Pagado",
          "Pendiente",
          "Acciones",
        ]}
        rows={activas.map((item) => {
          const saldo = Math.max(0, item.montoTotal - item.montoPagado);
          const hasSaldo = saldo > 0.01;
          return {
            key: item.id,
            cells: [
              <input
                type="checkbox"
                checked={selectedIds.has(item.id)}
                onChange={(e) => handleSelectRow(item.id, e.target.checked)}
              />,
              item.vagoNombre,
              item.vagoTelefono || "—",
              item.vagoEmail || "—",
              `$${item.montoTotal.toFixed(2)}`,
              `$${item.montoPagado.toFixed(2)}`,
              <span className={hasSaldo ? "text-danger font-medium" : "text-neutral"}>
                ${saldo.toFixed(2)}
              </span>,
              <div className="flex items-center gap-2">
                <Button
                  className="px-2 py-1 text-xs"
                  disabled={isReadOnly || !hasSaldo}
                  onClick={() => onRegistrarPago(item)}
                  type="button"
                  variant="secondary"
                >
                  Registrar Pago
                </Button>
                {!isReadOnly && (
                  <Button
                    className="px-2 py-1 text-xs text-neutral hover:text-danger"
                    disabled={isReadOnly}
                    onClick={() => void handleDelete(item)}
                    type="button"
                    variant="ghost"
                    title="Desinscribir"
                  >
                    <UserMinus size={16} />
                  </Button>
                )}
              </div>,
            ],
          };
        })}
      />

      <div className="mt-4 flex justify-end">
        {!isReadOnly && (
          <Button
            className="inline-flex items-center gap-2"
            variant="ghost"
            onClick={() => void onExportarPdf()}
            disabled={isExportingPdf}
          >
            <FileDown size={16} strokeWidth={1.8} />
            {isExportingPdf ? "Exportando PDF..." : "Exportar listado PDF"}
          </Button>
        )}
      </div>

      {/* Modales de acciones masivas */}
      <Modal isOpen={reminderOpen} onClose={() => setReminderOpen(false)} size="md" title={`Enviar recordatorio a ${selectedIds.size} vagos`}>
        <label className="mb-2 flex flex-col gap-1 text-sm">
          <span>Mensaje (HTML simple)</span>
          <textarea
            className="min-h-28 rounded-md border border-border px-3 py-2"
            value={reminderBody}
            onChange={(event) => setReminderBody(event.target.value)}
          />
        </label>
        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="ghost" onClick={() => setReminderOpen(false)}>
            Cancelar
          </Button>
          <Button type="button" disabled={isSending} onClick={() => void handleSendReminder()}>
            {isSending ? "Enviando..." : "Enviar"}
          </Button>
        </div>
      </Modal>

      <Modal isOpen={photosOpen} onClose={() => setPhotosOpen(false)} size="md" title={`Enviar fotos a ${selectedIds.size} vagos`}>
        <p className="mb-2 text-sm text-neutral">Se adjuntará el enlace de la carpeta Drive si existe.</p>
        <label className="mb-2 flex flex-col gap-1 text-sm">
          <span>Mensaje</span>
          <textarea
            className="min-h-24 rounded-md border border-border px-3 py-2"
            value={photosBody}
            onChange={(event) => setPhotosBody(event.target.value)}
          />
        </label>
        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="ghost" onClick={() => setPhotosOpen(false)}>
            Cancelar
          </Button>
          <Button type="button" disabled={isSending} onClick={() => void handleSendPhotos()}>
            {isSending ? "Enviando..." : "Enviar"}
          </Button>
        </div>
      </Modal>
    </Card>
  );
}
