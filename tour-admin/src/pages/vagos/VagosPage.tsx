import { useEffect, useRef, useState } from "react";
import type { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageHeader } from "@/components/layout/PageHeader";
import { AlertMessage } from "@/components/ui/AlertMessage";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table } from "@/components/ui/Table";
import { TableActions } from "@/components/ui/TableActions";
import { useAuth } from "@/hooks/useAuth";
import { nivelesExperienciaService } from "@/services/nivelesExperienciaService";
import { relacionesEmergenciaService } from "@/services/relacionesEmergenciaService";
import { vagosService } from "@/services/vagosService";
import { inscripcionesVagoService } from "@/services/inscripcionesVagoService";
import { toursService } from "@/services/toursService";
import { toServiceErrorMessage } from "@/services/serviceErrors";
import { softDeleteService } from "@/services/softDeleteService";
import { formatDui, formatPhone, normalizeDui, normalizePhone } from "@/utils/inputMasks";
import { vagoFormSchema, type VagoFormValues } from "@/utils/validaciones";
import type { NivelExperiencia } from "@/types/nivelExperiencia.types";
import type { RelacionEmergencia } from "@/types/relacionEmergencia.types";
import type { Vago } from "@/types/vago.types";

const defaultValues: VagoFormValues = {
  nombre: "",
  apellido: "",
  email: "",
  telefono: "",
  telefonoWhatsapp: "",
  dui: "",
  genero: "",
  fechaNacimiento: "",
  contactoEmergenciaNombre: "",
  contactoEmergenciaRelacionId: "",
  contactoEmergenciaRelacion: "",
  contactoEmergenciaTel: "",
  nivelExperienciaId: "",
  nivelExperiencia: "principiante",
  restriccionesMedicas: "",
  notasInternas: "",
};

function toDateInputValue(value: any): string {
  if (!value) {
    return "";
  }
  let d: Date;
  if (typeof value.toDate === "function") {
    d = value.toDate();
  } else {
    d = value instanceof Date ? value : new Date(value);
  }
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

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
const SEARCH_DEBOUNCE_MS = 300;
const VAGOS_PAGE_SIZE = 20;

function normalizeTerm(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function VagosPage() {
  const { profile } = useAuth();
  const [vagos, setVagos] = useState<Vago[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [relacionesEmergencia, setRelacionesEmergencia] = useState<RelacionEmergencia[]>([]);
  const [nivelesExperiencia, setNivelesExperiencia] = useState<NivelExperiencia[]>([]);
  const [selectedVago, setSelectedVago] = useState<Vago | null>(null);
  const [vagoToDelete, setVagoToDelete] = useState<Vago | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [historialVago, setHistorialVago] = useState<Vago | null>(null);
  const [historialRows, setHistorialRows] = useState<Array<[string, string, string, string, string, string]>>([]);
  const [isHistorialLoading, setIsHistorialLoading] = useState(false);
  const [filtroNivelId, setFiltroNivelId] = useState<string>("");
  const debounceTimerRef = useRef<number | null>(null);

  const form = useForm<VagoFormValues>({
    resolver: zodResolver(vagoFormSchema),
    defaultValues,
    mode: "onBlur",
    reValidateMode: "onChange",
  });
  const selectedRelationId = useWatch({ control: form.control, name: "contactoEmergenciaRelacionId" }) ?? "";
  const selectedExperienceId = useWatch({ control: form.control, name: "nivelExperienciaId" }) ?? "";

  const loadVagos = async (
    term = "",
    nextCursor?: QueryDocumentSnapshot<DocumentData>,
    nivelFiltro?: string,
  ) => {
    const nivelActivo = nivelFiltro !== undefined ? nivelFiltro : filtroNivelId;
    try {
      if (nextCursor) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setErrorMessage(null);
      const hasSearch = Boolean(normalizeTerm(term));
      const result = await vagosService.listPage({
        searchTerm: term,
        pageSize: VAGOS_PAGE_SIZE,
        cursor: nextCursor,
        nivelExperienciaId: !hasSearch && nivelActivo ? nivelActivo : undefined,
      });
      let items = result.items;
      if (nivelActivo && hasSearch) {
        items = items.filter((v) => v.nivelExperienciaId === nivelActivo);
      }
      if (nextCursor) {
        setVagos((current) => [...current, ...items]);
      } else {
        setVagos(items);
      }
      setCursor(result.nextCursor);
      setHasMore(Boolean(result.nextCursor));
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void (async () => {
        await Promise.all([
          loadVagos(),
          relacionesEmergenciaService.listActive().then(setRelacionesEmergencia),
          nivelesExperienciaService.listActive().then(setNivelesExperiencia),
        ]);
      })();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const openHistorial = async (vago: Vago) => {
    setHistorialVago(vago);
    setHistorialRows([]);
    setIsHistorialLoading(true);
    setErrorMessage(null);
    try {
      const rows = await inscripcionesVagoService.listByVagoId(vago.id);
      const table: Array<[string, string, string, string, string, string]> = [];
      for (const r of rows) {
        const tour = await toursService.getById(r.tourId);
        const ins = r.inscripcion;
        const saldo = Math.max(ins.montoTotal - ins.montoPagado, 0);
        table.push([
          tour?.nombre ?? r.tourId,
          tour ? new Date(tour.fechaInicio).toLocaleDateString("es-SV") : "—",
          ins.montoTotal.toFixed(2),
          ins.montoPagado.toFixed(2),
          saldo.toFixed(2),
          ins.estadoPago,
        ]);
      }
      setHistorialRows(table);
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    } finally {
      setIsHistorialLoading(false);
    }
  };

  const openCreateModal = () => {
    setSelectedVago(null);
    setSuccessMessage(null);
    form.reset(defaultValues);
    setIsFormModalOpen(true);
  };

  const openEditModal = (vago: Vago) => {
    setSelectedVago(vago);
    setSuccessMessage(null);
    form.reset({
      nombre: vago.nombre,
      apellido: vago.apellido,
      email: vago.email,
      telefono: formatPhone(vago.telefono),
      telefonoWhatsapp: vago.telefonoWhatsapp ? formatPhone(vago.telefonoWhatsapp) : "",
      dui: vago.dui ? formatDui(vago.dui) : "",
      genero: vago.genero ?? "",
      fechaNacimiento: toDateInputValue(vago.fechaNacimiento),
      contactoEmergenciaNombre: vago.contactoEmergenciaNombre,
      contactoEmergenciaRelacionId: vago.contactoEmergenciaRelacionId ?? "",
      contactoEmergenciaRelacion: vago.contactoEmergenciaRelacion,
      contactoEmergenciaTel: formatPhone(vago.contactoEmergenciaTel),
      nivelExperienciaId: vago.nivelExperienciaId ?? "",
      nivelExperiencia: vago.nivelExperiencia,
      restriccionesMedicas: vago.restriccionesMedicas ?? "",
      notasInternas: vago.notasInternas ?? "",
    });
    setIsFormModalOpen(true);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setSelectedVago(null);
    form.reset(defaultValues);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);
      const fechaNacimiento =
        values.fechaNacimiento && values.fechaNacimiento.length > 0
          ? new Date(values.fechaNacimiento)
          : undefined;
      const normalizedValues = {
        ...values,
        telefono: normalizePhone(values.telefono),
        telefonoWhatsapp: values.telefonoWhatsapp?.trim()
          ? normalizePhone(values.telefonoWhatsapp)
          : undefined,
        dui: values.dui?.trim() ? normalizeDui(values.dui) : undefined,
        fechaNacimiento,
        contactoEmergenciaTel: normalizePhone(values.contactoEmergenciaTel),
      };
      if (selectedVago) {
        await vagosService.update(selectedVago.id, normalizedValues);
        setSuccessMessage("Vago actualizado exitosamente.");
      } else {
        await vagosService.create({
          ...normalizedValues,
          activo: true,
          creadoPor: profile?.id ?? "sistema",
        });
        setSuccessMessage("Vago registrado exitosamente.");
      }
      closeFormModal();
      await loadVagos(searchTerm);
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    }
  });

  const handleDelete = async () => {
    if (!vagoToDelete) {
      return;
    }

    try {
      setErrorMessage(null);
      await softDeleteService.softDelete("vagos", vagoToDelete.id, {
        usuarioId: profile?.id ?? "sistema",
        usuarioEmail: profile?.email ?? "",
      });
      setVagoToDelete(null);
      setSuccessMessage("Vago eliminado del listado activo.");
      await loadVagos(searchTerm);
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    }
  };

  return (
    <>
      <PageHeader title="Gestión de Vagos" description="Registro y búsqueda de vagos con Firestore en tiempo real." />
      <Card>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap">
            <div className="md:w-96">
              <Input
                label="Buscar por nombre, correo o teléfono"
                value={searchTerm}
                onChange={(event) => {
                  const nextTerm = event.target.value;
                  setSearchTerm(nextTerm);
                  if (debounceTimerRef.current) {
                    window.clearTimeout(debounceTimerRef.current);
                  }
                  debounceTimerRef.current = window.setTimeout(() => {
                    void loadVagos(nextTerm);
                  }, SEARCH_DEBOUNCE_MS);
                }}
              />
            </div>
            <label className="flex flex-col gap-1 text-sm md:w-56">
              <span>Filtrar por nivel</span>
              <select
                className="rounded-md border border-border px-3 py-2"
                value={filtroNivelId}
                onChange={(event) => {
                  const value = event.target.value;
                  setFiltroNivelId(value);
                  setCursor(undefined);
                  void loadVagos(searchTerm, undefined, value);
                }}
              >
                <option value="">Todos</option>
                {nivelesExperiencia.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <Button onClick={openCreateModal}>Agregar vago</Button>
        </div>
        {errorMessage && !isFormModalOpen ? <AlertMessage type="error" message={errorMessage} className="mb-3" /> : null}
        {successMessage ? <AlertMessage type="success" message={successMessage} className="mb-3" /> : null}
        {isLoading ? (
          <p className="text-sm text-neutral">Cargando vagos...</p>
        ) : (
          <>
            <Table
              emptyMessage="No hay vagos registrados."
              headers={["Nombre", "Teléfono", "Email", "Edad", "Acciones"]}
              rows={vagos.map((vago) => ({
                key: vago.id,
                cells: [
                  `${vago.nombre} ${vago.apellido}`,
                  formatPhone(vago.telefono),
                  vago.email,
                  calculateAge(vago.fechaNacimiento),
                  <div key={`actions-${vago.id}`} className="flex flex-wrap gap-2">
                    <Button type="button" variant="ghost" onClick={() => void openHistorial(vago)}>
                      Historial
                    </Button>
                    <TableActions onDelete={() => setVagoToDelete(vago)} onEdit={() => openEditModal(vago)} />
                  </div>,
                ],
              }))}
            />
            {hasMore ? (
              <div className="mt-3 flex justify-end">
                <Button variant="ghost" disabled={isLoadingMore} onClick={() => void loadVagos(searchTerm, cursor)}>
                  {isLoadingMore ? "Cargando..." : "Cargar más"}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </Card>
      <Modal isOpen={isFormModalOpen} onClose={closeFormModal} size="lg" title={selectedVago ? "Editar vago" : "Agregar vago"}>
        <form className="space-y-3" onSubmit={(event) => void onSubmit(event)}>
          {/* Error dentro del modal para no tapar el contenido */}
          {errorMessage && isFormModalOpen ? (
            <AlertMessage type="error" message={errorMessage} />
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="Nombre" {...form.register("nombre")} error={form.formState.errors.nombre?.message} />
            <Input label="Apellido" {...form.register("apellido")} error={form.formState.errors.apellido?.message} />
            <Input label="Email" {...form.register("email")} error={form.formState.errors.email?.message} />
            <Input label="Teléfono" mask={formatPhone} {...form.register("telefono")} error={form.formState.errors.telefono?.message} />
            <Input
              label="WhatsApp (opcional)"
              mask={formatPhone}
              {...form.register("telefonoWhatsapp")}
              error={form.formState.errors.telefonoWhatsapp?.message}
            />
            <Input label="DUI (opcional)" mask={formatDui} {...form.register("dui")} error={form.formState.errors.dui?.message} />
            <label className="flex flex-col gap-1 text-sm">
              <span>Género (opcional)</span>
              <select className="rounded-md border border-border px-3 py-2" {...form.register("genero")}>
                <option value="">Seleccionar...</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
                <option value="otro">Otro</option>
              </select>
            </label>
            <Input label="Fecha de nacimiento" type="date" {...form.register("fechaNacimiento")} />
            <Input
              label="Contacto de emergencia"
              {...form.register("contactoEmergenciaNombre")}
              error={form.formState.errors.contactoEmergenciaNombre?.message}
            />
            <input type="hidden" {...form.register("contactoEmergenciaRelacion")} />
            <label className="flex flex-col gap-1 text-sm">
              <span>Relación contacto emergencia</span>
              <select
                className="rounded-md border border-border px-3 py-2"
                value={selectedRelationId}
                onChange={(event) => {
                  const selected = relacionesEmergencia.find((item) => item.id === event.target.value);
                  form.setValue("contactoEmergenciaRelacionId", event.target.value);
                  form.setValue("contactoEmergenciaRelacion", selected?.nombre ?? "");
                }}
              >
                <option value="">Selecciona una relación</option>
                {relacionesEmergencia.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label="Teléfono emergencia"
              mask={formatPhone}
              {...form.register("contactoEmergenciaTel")}
              error={form.formState.errors.contactoEmergenciaTel?.message}
            />
            <label className="flex flex-col gap-1 text-sm">
              <span>Nivel de experiencia</span>
              <select
                className="rounded-md border border-border px-3 py-2"
                value={selectedExperienceId}
                onChange={(event) => {
                  const selected = nivelesExperiencia.find((item) => item.id === event.target.value);
                  form.setValue("nivelExperienciaId", event.target.value);
                  form.setValue("nivelExperiencia", selected?.nombre ?? "");
                }}
              >
                <option value="">Selecciona un nivel</option>
                {nivelesExperiencia.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm md:col-span-2">
              <span>Restricciones médicas o físicas</span>
              <textarea className="min-h-20 rounded-md border border-border px-3 py-2" {...form.register("restriccionesMedicas")} />
            </label>
            <label className="flex flex-col gap-1 text-sm md:col-span-2">
              <span>Notas internas</span>
              <textarea className="min-h-20 rounded-md border border-border px-3 py-2" {...form.register("notasInternas")} />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={closeFormModal}>
              Cancelar
            </Button>
            <Button disabled={form.formState.isSubmitting} type="submit">
              {form.formState.isSubmitting ? "Guardando..." : selectedVago ? "Actualizar vago" : "Guardar vago"}
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        isOpen={Boolean(historialVago)}
        onClose={() => setHistorialVago(null)}
        size="lg"
        title={historialVago ? `Historial — ${historialVago.nombre} ${historialVago.apellido}` : "Historial"}
      >
        {isHistorialLoading ? <p className="text-sm text-neutral">Cargando...</p> : null}
        <Table
          emptyMessage="No hay inscripciones registradas."
          headers={["Tour", "Fecha tour", "Monto total", "Pagado", "Saldo", "Estado pago"]}
          rows={historialRows}
        />
      </Modal>
      <Modal isOpen={Boolean(vagoToDelete)} onClose={() => setVagoToDelete(null)} size="sm" title="Eliminar vago">
        <p className="text-sm text-textDark">
          Se marcará como inactivo a {vagoToDelete?.nombre} {vagoToDelete?.apellido}. El historial asociado se conservará.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setVagoToDelete(null)}>
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
