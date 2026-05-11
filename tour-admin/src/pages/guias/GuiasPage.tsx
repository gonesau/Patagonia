import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Table } from "@/components/ui/Table";
import { TableActions } from "@/components/ui/TableActions";
import { useAuth } from "@/hooks/useAuth";
import { estadosGuiaService } from "@/services/estadosGuiaService";
import { guiasService } from "@/services/guiasService";
import { guiaDocumentosService } from "@/services/guiaDocumentosService";
import { softDeleteService } from "@/services/softDeleteService";
import { toursService } from "@/services/toursService";
import { uploadAdminFile } from "@/services/storageUploadService";
import { toServiceErrorMessage } from "@/services/serviceErrors";
import { formatDui, formatPhone, normalizeDui, normalizePhone } from "@/utils/inputMasks";
import { guiaFormSchema, type GuiaFormValues } from "@/utils/validaciones";
import type { EstadoGuia } from "@/types/estadoGuia.types";
import type { Guia } from "@/types/guia.types";
import type { GuiaDocumento, TipoDocumentoGuia } from "@/types/guiaDocumento.types";
import type { TourOcurrencia } from "@/types/tour.types";

const defaultValues: GuiaFormValues = {
  nombre: "",
  apellido: "",
  dui: "",
  email: "",
  telefono: "",
  estado: "activo",
  especialidad: "",
  grupoSanguineo: "",
  alergias: "",
  condicionesMedicas: "",
  contactoEmergenciaNombre: "",
  contactoEmergenciaTel: "",
};

const tiposDoc: { value: TipoDocumentoGuia; label: string }[] = [
  { value: "dui", label: "DUI" },
  { value: "primeros_auxilios", label: "Primeros auxilios" },
  { value: "carnet_guia", label: "Carnet de guía" },
  { value: "certificacion", label: "Certificación" },
  { value: "otro", label: "Otro" },
];

function diasHastaVencimiento(vence: Date | undefined): number | null {
  if (!vence) {
    return null;
  }
  const ms = new Date(vence).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function GuiasPage() {
  const { profile } = useAuth();
  const [guias, setGuias] = useState<Guia[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [estadosGuia, setEstadosGuia] = useState<EstadoGuia[]>([]);
  const [selectedGuia, setSelectedGuia] = useState<Guia | null>(null);
  const [guiaToDelete, setGuiaToDelete] = useState<Guia | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [documentos, setDocumentos] = useState<GuiaDocumento[]>([]);
  const [docTipo, setDocTipo] = useState<TipoDocumentoGuia>("otro");
  const [docNombre, setDocNombre] = useState("");
  const [docVence, setDocVence] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [agendaGuia, setAgendaGuia] = useState<Guia | null>(null);
  const [agendaTours, setAgendaTours] = useState<TourOcurrencia[]>([]);
  const [isAgendaLoading, setIsAgendaLoading] = useState(false);

  const form = useForm<GuiaFormValues>({
    resolver: zodResolver(guiaFormSchema),
    defaultValues,
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const loadGuias = async () => {
    try {
      setErrorMessage(null);
      setGuias(await guiasService.list());
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    }
  };

  useEffect(() => {
    void (async () => {
      await Promise.all([loadGuias(), estadosGuiaService.listActive().then(setEstadosGuia)]);
    })();
  }, []);

  const loadDocumentos = async (guiaId: string) => {
    setDocumentos(await guiaDocumentosService.list(guiaId));
  };

  const openCreateModal = () => {
    setSelectedGuia(null);
    setSuccessMessage(null);
    setDocumentos([]);
    form.reset(defaultValues);
    setIsFormModalOpen(true);
  };

  const openEditModal = async (guia: Guia) => {
    setSelectedGuia(guia);
    setSuccessMessage(null);
    form.reset({
      nombre: guia.nombre,
      apellido: guia.apellido,
      dui: formatDui(guia.dui),
      email: guia.email,
      telefono: formatPhone(guia.telefono),
      estado: guia.estado,
      especialidad: guia.especialidad ?? "",
      grupoSanguineo: guia.grupoSanguineo ?? "",
      alergias: guia.alergias ?? "",
      condicionesMedicas: guia.condicionesMedicas ?? "",
      contactoEmergenciaNombre: guia.contactoEmergenciaNombre,
      contactoEmergenciaTel: formatPhone(guia.contactoEmergenciaTel),
    });
    await loadDocumentos(guia.id);
    setIsFormModalOpen(true);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setSelectedGuia(null);
    setDocumentos([]);
    form.reset(defaultValues);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);
      const normalizedValues = {
        ...values,
        dui: normalizeDui(values.dui),
        telefono: normalizePhone(values.telefono),
        contactoEmergenciaTel: normalizePhone(values.contactoEmergenciaTel),
        especialidad: values.especialidad?.trim() || undefined,
        grupoSanguineo: values.grupoSanguineo?.trim() || undefined,
        alergias: values.alergias?.trim() || undefined,
        condicionesMedicas: values.condicionesMedicas?.trim() || undefined,
      };
      if (selectedGuia) {
        await guiasService.update(selectedGuia.id, normalizedValues);
        setSuccessMessage("Guía actualizado exitosamente.");
      } else {
        await guiasService.create(normalizedValues);
        setSuccessMessage("Guía registrado exitosamente.");
      }
      closeFormModal();
      await loadGuias();
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    }
  });

  const handleSubirDocumento = async () => {
    if (!selectedGuia || !docFile || !docNombre.trim()) {
      return;
    }
    setIsUploadingDoc(true);
    setErrorMessage(null);
    try {
      const path = `guias/${selectedGuia.id}/documentos/${Date.now()}_${docFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const archivoUrl = await uploadAdminFile(path, docFile);
      await guiaDocumentosService.create(selectedGuia.id, {
        tipo: docTipo,
        nombre: docNombre.trim(),
        archivoUrl,
        venceEn: docVence ? new Date(docVence) : undefined,
      });
      setDocNombre("");
      setDocVence("");
      setDocFile(null);
      await loadDocumentos(selectedGuia.id);
      setSuccessMessage("Documento cargado.");
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleEliminarDocumento = async (docId: string) => {
    if (!selectedGuia) {
      return;
    }
    await guiaDocumentosService.remove(selectedGuia.id, docId);
    await loadDocumentos(selectedGuia.id);
  };

  const openAgenda = async (guia: Guia) => {
    setAgendaGuia(guia);
    setIsAgendaLoading(true);
    try {
      const tours = await toursService.list(guia.id);
      setAgendaTours(tours);
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    } finally {
      setIsAgendaLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!guiaToDelete) {
      return;
    }

    try {
      setErrorMessage(null);
      await softDeleteService.softDelete("guias", guiaToDelete.id, {
        usuarioId: profile?.id ?? "sistema",
        usuarioEmail: profile?.email ?? "",
      });
      setGuiaToDelete(null);
      setSuccessMessage("Guía eliminado del listado operativo.");
      await loadGuias();
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    }
  };

  return (
    <>
      <PageHeader title="Gestión de Guías" description="Registro de guías con estado operativo y datos críticos." />
      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="font-heading text-lg">Listado de guías</h3>
          <Button onClick={openCreateModal}>Agregar guía</Button>
        </div>
        {errorMessage ? <p className="mb-3 text-sm text-danger">{errorMessage}</p> : null}
        {successMessage ? <p className="mb-3 text-sm text-success">{successMessage}</p> : null}
        <Table
          emptyMessage="No hay guías registrados."
          headers={["Nombre", "DUI", "Email", "Teléfono", "Estado", "Acciones"]}
          rows={guias.map((guia) => ({
            key: guia.id,
            cells: [
              `${guia.nombre} ${guia.apellido}`,
              formatDui(guia.dui),
              guia.email,
              formatPhone(guia.telefono),
              guia.estado,
              <div key={`act-${guia.id}`} className="flex flex-wrap gap-2">
                <Button type="button" variant="ghost" onClick={() => void openAgenda(guia)}>
                  Agenda
                </Button>
                <TableActions onDelete={() => setGuiaToDelete(guia)} onEdit={() => void openEditModal(guia)} />
              </div>,
            ],
          }))}
        />
      </Card>
      <Modal isOpen={isFormModalOpen} onClose={closeFormModal} size="lg" title={selectedGuia ? "Editar guía" : "Agregar guía"}>
        <form className="space-y-3" onSubmit={(event) => void onSubmit(event)}>
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="Nombre" {...form.register("nombre")} error={form.formState.errors.nombre?.message} />
            <Input label="Apellido" {...form.register("apellido")} error={form.formState.errors.apellido?.message} />
            <Input label="DUI" mask={formatDui} {...form.register("dui")} error={form.formState.errors.dui?.message} />
            <Input label="Email" {...form.register("email")} error={form.formState.errors.email?.message} />
            <Input label="Teléfono" mask={formatPhone} {...form.register("telefono")} error={form.formState.errors.telefono?.message} />
            <Input label="Especialidad" {...form.register("especialidad")} />
            <Input label="Grupo sanguíneo" {...form.register("grupoSanguineo")} />
            <label className="flex flex-col gap-1 text-sm md:col-span-2">
              <span>Alergias</span>
              <textarea className="min-h-16 rounded-md border border-border px-3 py-2" {...form.register("alergias")} />
            </label>
            <label className="flex flex-col gap-1 text-sm md:col-span-2">
              <span>Condiciones médicas</span>
              <textarea className="min-h-16 rounded-md border border-border px-3 py-2" {...form.register("condicionesMedicas")} />
            </label>
            <Input
              label="Contacto emergencia"
              {...form.register("contactoEmergenciaNombre")}
              error={form.formState.errors.contactoEmergenciaNombre?.message}
            />
            <Input
              label="Tel. emergencia"
              mask={formatPhone}
              {...form.register("contactoEmergenciaTel")}
              error={form.formState.errors.contactoEmergenciaTel?.message}
            />
            <label className="flex flex-col gap-1 text-sm">
              <span>Estado</span>
              <select className="rounded-md border border-border px-3 py-2" {...form.register("estado")}>
                <option value="">Selecciona estado</option>
                {estadosGuia.map((item) => (
                  <option key={item.id} value={item.nombre}>
                    {item.nombre}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {selectedGuia ? (
            <div className="rounded-md border border-border p-3">
              <h4 className="mb-2 font-heading text-base">Documentos</h4>
              <div className="mb-3 grid gap-2 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                  <span>Tipo</span>
                  <select
                    className="rounded-md border border-border px-3 py-2"
                    value={docTipo}
                    onChange={(event) => setDocTipo(event.target.value as TipoDocumentoGuia)}
                  >
                    {tiposDoc.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <Input label="Nombre descriptivo" value={docNombre} onChange={(event) => setDocNombre(event.target.value)} />
                <Input label="Vence (opcional)" type="date" value={docVence} onChange={(event) => setDocVence(event.target.value)} />
                <label className="flex flex-col gap-1 text-sm">
                  <span>Archivo (PDF/JPG/PNG)</span>
                  <input
                    accept=".pdf,image/*"
                    className="text-sm"
                    type="file"
                    onChange={(event) => setDocFile(event.target.files?.[0] ?? null)}
                  />
                </label>
                <div className="md:col-span-2">
                  <Button type="button" disabled={isUploadingDoc} onClick={() => void handleSubirDocumento()}>
                    {isUploadingDoc ? "Subiendo..." : "Subir documento"}
                  </Button>
                </div>
              </div>
              <Table
                emptyMessage="Sin documentos."
                headers={["Tipo", "Nombre", "Vence", "Alerta", "Acción"]}
                rows={documentos.map((d) => {
                  const dias = diasHastaVencimiento(d.venceEn);
                  const alerta =
                    dias === null
                      ? "—"
                      : dias < 0
                        ? "Vencido"
                        : dias <= 7
                          ? "Urgente"
                          : dias <= 30
                            ? "Próximo"
                            : "OK";
                  return {
                    key: d.id,
                    cells: [
                      d.tipo,
                      d.nombre,
                      d.venceEn ? new Date(d.venceEn).toLocaleDateString("es-SV") : "—",
                      alerta,
                      <Button key={`del-${d.id}`} type="button" variant="ghost" onClick={() => void handleEliminarDocumento(d.id)}>
                        Quitar
                      </Button>,
                    ],
                  };
                })}
              />
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={closeFormModal}>
              Cancelar
            </Button>
            <Button disabled={form.formState.isSubmitting} type="submit">
              {form.formState.isSubmitting ? "Guardando..." : selectedGuia ? "Actualizar guía" : "Guardar guía"}
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        isOpen={Boolean(agendaGuia)}
        onClose={() => setAgendaGuia(null)}
        size="lg"
        title={agendaGuia ? `Agenda — ${agendaGuia.nombre} ${agendaGuia.apellido}` : "Agenda"}
      >
        {isAgendaLoading ? <p className="text-sm text-neutral">Cargando...</p> : null}
        <Table
          emptyMessage="No hay ocurrencias asignadas."
          headers={["Tour", "Fecha", "Estado"]}
          rows={agendaTours.map((t) => ({
            key: t.id,
            cells: [t.nombre, new Date(t.fechaInicio).toLocaleString("es-SV"), t.estado],
          }))}
        />
      </Modal>
      <Modal isOpen={Boolean(guiaToDelete)} onClose={() => setGuiaToDelete(null)} size="sm" title="Eliminar guía">
        <p className="text-sm text-textDark">
          Se marcará como inactivo a {guiaToDelete?.nombre} {guiaToDelete?.apellido}. El historial asociado se conservará.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setGuiaToDelete(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={() => void handleDelete()}>
            Eliminar
          </Button>
        </div>
      </Modal>
    </>
  );
}
