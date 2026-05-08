import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Table } from "@/components/ui/Table";
import { TableActions } from "@/components/ui/TableActions";
import { useAuth } from "@/hooks/useAuth";
import { vagosService } from "@/services/vagosService";
import { toServiceErrorMessage } from "@/services/serviceErrors";
import { formatPhone, normalizePhone } from "@/utils/inputMasks";
import { vagoFormSchema, type VagoFormValues } from "@/utils/validaciones";
import type { Vago } from "@/types/vago.types";

const defaultValues: VagoFormValues = {
  nombre: "",
  apellido: "",
  email: "",
  telefono: "",
  contactoEmergenciaNombre: "",
  contactoEmergenciaRelacion: "",
  contactoEmergenciaTel: "",
};

export function VagosPage() {
  const { profile } = useAuth();
  const [vagos, setVagos] = useState<Vago[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedVago, setSelectedVago] = useState<Vago | null>(null);
  const [vagoToDelete, setVagoToDelete] = useState<Vago | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const form = useForm<VagoFormValues>({
    resolver: zodResolver(vagoFormSchema),
    defaultValues,
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const loadVagos = async (term = "") => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const data = await vagosService.list(term);
      setVagos(data);
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadVagos();
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
      contactoEmergenciaRelacion: vago.contactoEmergenciaRelacion,
      contactoEmergenciaTel: formatPhone(vago.contactoEmergenciaTel),
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
          nivelExperiencia: "principiante",
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
                void loadVagos(nextTerm);
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
            <Input
              label="Relación contacto emergencia"
              {...form.register("contactoEmergenciaRelacion")}
              error={form.formState.errors.contactoEmergenciaRelacion?.message}
            />
            <Input
              label="Teléfono emergencia"
              mask={formatPhone}
              {...form.register("contactoEmergenciaTel")}
              error={form.formState.errors.contactoEmergenciaTel?.message}
            />
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
