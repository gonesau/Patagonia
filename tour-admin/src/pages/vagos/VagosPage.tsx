import { useEffect, useRef, useState } from "react";
import type { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageHeader } from "@/components/layout/PageHeader";
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
import { toServiceErrorMessage } from "@/services/serviceErrors";
import { formatPhone, normalizePhone } from "@/utils/inputMasks";
import { vagoFormSchema, type VagoFormValues } from "@/utils/validaciones";
import type { NivelExperiencia } from "@/types/nivelExperiencia.types";
import type { RelacionEmergencia } from "@/types/relacionEmergencia.types";
import type { Vago } from "@/types/vago.types";

const defaultValues: VagoFormValues = {
  nombre: "",
  apellido: "",
  email: "",
  telefono: "",
  contactoEmergenciaNombre: "",
  contactoEmergenciaRelacionId: "",
  contactoEmergenciaRelacion: "",
  contactoEmergenciaTel: "",
  nivelExperienciaId: "",
  nivelExperiencia: "principiante",
};
const SEARCH_DEBOUNCE_MS = 300;
const VAGOS_PAGE_SIZE = 20;

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
  const debounceTimerRef = useRef<number | null>(null);

  const form = useForm<VagoFormValues>({
    resolver: zodResolver(vagoFormSchema),
    defaultValues,
    mode: "onBlur",
    reValidateMode: "onChange",
  });
  const selectedRelationId = useWatch({ control: form.control, name: "contactoEmergenciaRelacionId" }) ?? "";
  const selectedExperienceId = useWatch({ control: form.control, name: "nivelExperienciaId" }) ?? "";

  const loadVagos = async (term = "", nextCursor?: QueryDocumentSnapshot<DocumentData>) => {
    try {
      if (nextCursor) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setErrorMessage(null);
      const result = await vagosService.listPage({
        searchTerm: term,
        pageSize: VAGOS_PAGE_SIZE,
        cursor: nextCursor,
      });
      if (nextCursor) {
        setVagos((current) => [...current, ...result.items]);
      } else {
        setVagos(result.items);
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
      contactoEmergenciaNombre: vago.contactoEmergenciaNombre,
      contactoEmergenciaRelacionId: vago.contactoEmergenciaRelacionId ?? "",
      contactoEmergenciaRelacion: vago.contactoEmergenciaRelacion,
      contactoEmergenciaTel: formatPhone(vago.contactoEmergenciaTel),
      nivelExperienciaId: vago.nivelExperienciaId ?? "",
      nivelExperiencia: vago.nivelExperiencia,
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
      const normalizedValues = {
        ...values,
        telefono: normalizePhone(values.telefono),
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
      await vagosService.update(vagoToDelete.id, { activo: false });
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
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
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
          <Button onClick={openCreateModal}>Agregar vago</Button>
        </div>
        {errorMessage ? <p className="mb-3 text-sm text-danger">{errorMessage}</p> : null}
        {successMessage ? <p className="mb-3 text-sm text-success">{successMessage}</p> : null}
        {isLoading ? (
          <p className="text-sm text-neutral">Cargando vagos...</p>
        ) : (
          <>
            <Table
              emptyMessage="No hay vagos registrados."
              headers={["Nombre", "Teléfono", "Email", "Estado", "Acciones"]}
              rows={vagos.map((vago) => ({
                key: vago.id,
                cells: [
                  `${vago.nombre} ${vago.apellido}`,
                  formatPhone(vago.telefono),
                  vago.email,
                  vago.activo ? "Activo" : "Inactivo",
                  <TableActions key={`actions-${vago.id}`} onDelete={() => setVagoToDelete(vago)} onEdit={() => openEditModal(vago)} />,
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
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="Nombre" {...form.register("nombre")} error={form.formState.errors.nombre?.message} />
            <Input label="Apellido" {...form.register("apellido")} error={form.formState.errors.apellido?.message} />
            <Input label="Email" {...form.register("email")} error={form.formState.errors.email?.message} />
            <Input label="Teléfono" mask={formatPhone} {...form.register("telefono")} error={form.formState.errors.telefono?.message} />
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
