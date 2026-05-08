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
import { estadosGuiaService } from "@/services/estadosGuiaService";
import { guiasService } from "@/services/guiasService";
import { toServiceErrorMessage } from "@/services/serviceErrors";
import { formatDui, formatPhone, normalizeDui, normalizePhone } from "@/utils/inputMasks";
import { guiaFormSchema, type GuiaFormValues } from "@/utils/validaciones";
import type { EstadoGuia } from "@/types/estadoGuia.types";
import type { Guia } from "@/types/guia.types";

const defaultValues: GuiaFormValues = {
  nombre: "",
  apellido: "",
  dui: "",
  email: "",
  telefono: "",
  estado: "activo",
  contactoEmergenciaNombre: "",
  contactoEmergenciaTel: "",
};

export function GuiasPage() {
  const [guias, setGuias] = useState<Guia[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [estadosGuia, setEstadosGuia] = useState<EstadoGuia[]>([]);
  const [selectedGuia, setSelectedGuia] = useState<Guia | null>(null);
  const [guiaToDelete, setGuiaToDelete] = useState<Guia | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
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

  const openCreateModal = () => {
    setSelectedGuia(null);
    setSuccessMessage(null);
    form.reset(defaultValues);
    setIsFormModalOpen(true);
  };

  const openEditModal = (guia: Guia) => {
    setSelectedGuia(guia);
    setSuccessMessage(null);
    form.reset({
      nombre: guia.nombre,
      apellido: guia.apellido,
      dui: formatDui(guia.dui),
      email: guia.email,
      telefono: formatPhone(guia.telefono),
      estado: guia.estado,
      contactoEmergenciaNombre: guia.contactoEmergenciaNombre,
      contactoEmergenciaTel: formatPhone(guia.contactoEmergenciaTel),
    });
    setIsFormModalOpen(true);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setSelectedGuia(null);
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

  const handleDelete = async () => {
    if (!guiaToDelete) {
      return;
    }

    try {
      setErrorMessage(null);
      await guiasService.update(guiaToDelete.id, { estado: "inactivo" });
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
              <TableActions key={`actions-${guia.id}`} onDelete={() => setGuiaToDelete(guia)} onEdit={() => openEditModal(guia)} />,
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
