import { useMemo, useState } from "react";
import { Users, Mail, ImageIcon, FileDown, UserMinus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DataCard } from "@/components/ui/DataCard";
import { Table, type TableRow } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import type { Inscripcion } from "@/types/inscripcion.types";
import { notificacionesService } from "@/services/notificacionesService";
import { vagosService } from "@/services/vagosService";
import type { Vago } from "@/types/vago.types";
import { AlertMessage } from "@/components/ui/AlertMessage";
import { toServiceErrorMessage } from "@/services/serviceErrors";

function calculateAge(value: any): string {
  if (!value) return "N/A";
  let d: Date;
  if (typeof value.toDate === "function") {
    d = value.toDate();
  } else {
    d = value instanceof Date ? value : new Date(value);
  }
  if (Number.isNaN(d.getTime())) return "N/A";
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) {
    age--;
  }
  return age.toString();
}


interface VagosInscritosPanelProps {
  tourId: string;
  inscripciones: Inscripcion[];
  isReadOnly: boolean;
  canViewFinancial: boolean;
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
  canViewFinancial,
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
  const [selectedVagoDetail, setSelectedVagoDetail] = useState<Vago | null>(null);
  const [isLoadingVago, setIsLoadingVago] = useState(false);

  const handleViewVago = async (vagoId: string) => {
    setIsLoadingVago(true);
    setErrorMessage(null);
    try {
      const vago = await vagosService.getById(vagoId);
      if (vago) {
        setSelectedVagoDetail(vago);
      } else {
        setErrorMessage("No se encontró la información del vago.");
      }
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    } finally {
      setIsLoadingVago(false);
    }
  };

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

  const handleSelectVisibleRows = (visibleRowKeys: string[], checked: boolean) => {
    const nextSelected = new Set(selectedIds);
    if (checked) {
      visibleRowKeys.forEach((id) => nextSelected.add(id));
    } else {
      visibleRowKeys.forEach((id) => nextSelected.delete(id));
    }
    setSelectedIds(nextSelected);
  };

  const isPageFullySelected = (visibleRowKeys: string[]) =>
    visibleRowKeys.length > 0 && visibleRowKeys.every((id) => selectedIds.has(id));

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
              variant="secondary"
              className="px-2 py-1 text-xs"
              onClick={() => setReminderOpen(true)}
            >
              <Mail size={14} className="mr-1" /> Enviar recordatorio
            </Button>
            <Button
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
        mobilePageSize={8}
        renderMobileToolbar={(visibleRowKeys) =>
          !isReadOnly && visibleRowKeys.length > 0 ? (
            <label className="flex items-center gap-2 rounded-md border border-border bg-slate-50 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={isPageFullySelected(visibleRowKeys)}
                onChange={(event) => handleSelectVisibleRows(visibleRowKeys, event.target.checked)}
              />
              <span>Seleccionar todos en esta página ({visibleRowKeys.length})</span>
            </label>
          ) : null
        }
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
          ...(canViewFinancial ? ["Total", "Pagado", "Pendiente"] : []),
          "Acciones",
        ]}
        renderMobileCard={(row: TableRow) => {
          const item = activas.find((inscripcion) => inscripcion.id === row.key);
          if (!item) {
            return null;
          }
          const saldo = Math.max(0, item.montoTotal - item.montoPagado);
          const hasSaldo = saldo > 0.01;
          return (
            <DataCard
              key={item.id}
              leading={
                !isReadOnly ? (
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={(event) => handleSelectRow(item.id, event.target.checked)}
                  />
                ) : undefined
              }
              title={
                <button
                  type="button"
                  className={`text-left ${isLoadingVago ? "opacity-50" : "font-semibold text-[#0d6efd] underline-offset-2 hover:underline"}`}
                  onClick={() => void handleViewVago(item.vagoId)}
                  disabled={isLoadingVago}
                >
                  {item.vagoNombre}
                </button>
              }
              fields={[
                { label: "Teléfono", value: item.vagoTelefono || "—" },
                { label: "Email", value: item.vagoEmail || "—" },
                ...(canViewFinancial
                  ? [
                      { label: "Total", value: `$${item.montoTotal.toFixed(2)}` },
                      { label: "Pagado", value: `$${item.montoPagado.toFixed(2)}` },
                      {
                        label: "Pendiente",
                        value: (
                          <span className={hasSaldo ? "font-medium text-danger" : "text-neutral"}>
                            ${saldo.toFixed(2)}
                          </span>
                        ),
                      },
                    ]
                  : []),
              ]}
              actions={
                <div className="flex w-full flex-col gap-2 sm:flex-row">
                  {canViewFinancial ? (
                    <Button
                      className="min-h-11 w-full sm:w-auto"
                      disabled={isReadOnly || !hasSaldo}
                      onClick={() => onRegistrarPago(item)}
                      type="button"
                      variant="secondary"
                    >
                      Registrar Pago
                    </Button>
                  ) : null}
                  {!isReadOnly ? (
                    <Button
                      className="min-h-11 w-full sm:w-auto"
                      onClick={() => void handleDelete(item)}
                      type="button"
                      variant="ghost"
                    >
                      <UserMinus size={16} className="mr-1 inline" />
                      Desinscribir
                    </Button>
                  ) : null}
                </div>
              }
            />
          );
        }}
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
              <button
                type="button"
                className={`text-left ${isLoadingVago ? 'opacity-50' : 'font-semibold text-[#0d6efd] underline-offset-2 hover:underline'}`}
                onClick={() => void handleViewVago(item.vagoId)}
                title="Ver detalles del vago"
                disabled={isLoadingVago}
              >
                {item.vagoNombre}
              </button>,
              item.vagoTelefono || "—",
              item.vagoEmail || "—",
              ...(canViewFinancial
                ? [
                    `$${item.montoTotal.toFixed(2)}`,
                    `$${item.montoPagado.toFixed(2)}`,
                    <span className={hasSaldo ? "text-danger font-medium" : "text-neutral"}>
                      ${saldo.toFixed(2)}
                    </span>,
                  ]
                : []),
              <div className="flex items-center gap-2">
                {canViewFinancial ? (
                  <Button
                    className="px-2 py-1 text-xs"
                    disabled={isReadOnly || !hasSaldo}
                    onClick={() => onRegistrarPago(item)}
                    type="button"
                    variant="secondary"
                  >
                    Registrar Pago
                  </Button>
                ) : null}
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

      <Modal isOpen={Boolean(selectedVagoDetail)} onClose={() => setSelectedVagoDetail(null)} size="md" title="Detalles del vago">
        {selectedVagoDetail ? (
          <div className="grid gap-y-4 gap-x-6 sm:grid-cols-2 text-sm text-textDark max-h-[70vh] overflow-y-auto pr-2">
            <div className="sm:col-span-2">
              <p className="font-semibold text-neutral">Nombre Completo</p>
              <p>{selectedVagoDetail.nombre} {selectedVagoDetail.apellido}</p>
            </div>
            <div>
              <p className="font-semibold text-neutral">DUI</p>
              <p>{selectedVagoDetail.dui || "—"}</p>
            </div>
            <div>
              <p className="font-semibold text-neutral">Género</p>
              <p>{selectedVagoDetail.genero || "—"}</p>
            </div>
            <div>
              <p className="font-semibold text-neutral">Edad</p>
              <p>{selectedVagoDetail.fechaNacimiento ? calculateAge(selectedVagoDetail.fechaNacimiento) : "—"}</p>
            </div>
            <div>
              <p className="font-semibold text-neutral">Nivel de Experiencia</p>
              <p>{selectedVagoDetail.nivelExperiencia || selectedVagoDetail.nivelExperienciaId || "—"}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="font-semibold text-neutral">Email</p>
              <p>{selectedVagoDetail.email}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="font-semibold text-neutral">Teléfono</p>
              <p>{selectedVagoDetail.telefono}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="font-semibold text-neutral">Contacto de Emergencia</p>
              <p>{selectedVagoDetail.contactoEmergenciaNombre ? `${selectedVagoDetail.contactoEmergenciaNombre} - ${selectedVagoDetail.contactoEmergenciaTel}` : "—"}</p>
            </div>
            {selectedVagoDetail.restriccionesMedicas ? (
              <div className="sm:col-span-2">
                <p className="font-semibold text-neutral">Restricciones Médicas</p>
                <p className="whitespace-pre-wrap">{selectedVagoDetail.restriccionesMedicas}</p>
              </div>
            ) : null}
            <div className="sm:col-span-2">
              <p className="font-semibold text-neutral">Notas Internas</p>
              <p className="whitespace-pre-wrap">{selectedVagoDetail.notasInternas || "—"}</p>
            </div>
          </div>
        ) : null}
        <div className="mt-6 flex justify-end">
          <Button variant="ghost" onClick={() => setSelectedVagoDetail(null)}>Cerrar</Button>
        </div>
      </Modal>
    </Card>
  );
}
