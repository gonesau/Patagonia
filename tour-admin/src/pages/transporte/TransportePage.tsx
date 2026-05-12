import { useEffect, useState } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Table } from "@/components/ui/Table";
import { TableActions } from "@/components/ui/TableActions";
import { useAuth } from "@/hooks/useAuth";
import { tiposVehiculoService } from "@/services/tiposVehiculoService";
import { transporteService } from "@/services/transporteService";
import { softDeleteService } from "@/services/softDeleteService";
import { toServiceErrorMessage } from "@/services/serviceErrors";
import type { TipoVehiculo } from "@/types/tipoVehiculo.types";
import { formatPhone, formatPlate } from "@/utils/inputMasks";
import { transporteFormSchema, type TransporteFormValues } from "@/utils/validaciones";
import type { Transporte } from "@/types/transporte.types";

const defaultValues: TransporteFormValues = {
  tipoVehiculoId: "",
  tipoVehiculoNombreSnapshot: "",
  empresa: "",
  motorista: "",
  telefonoMotorista: "",
  marca: "",
  modelo: "",
  anio: undefined,
  placa: "",
  capacidad: 0,
  activo: true,
};

export function TransportePage() {
  const { profile } = useAuth();
  const [unidades, setUnidades] = useState<Transporte[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [tiposVehiculo, setTiposVehiculo] = useState<TipoVehiculo[]>([]);
  const [selectedUnidad, setSelectedUnidad] = useState<Transporte | null>(null);
  const [unidadToDelete, setUnidadToDelete] = useState<Transporte | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const form = useForm<TransporteFormValues>({
    resolver: zodResolver(transporteFormSchema) as Resolver<TransporteFormValues>,
    defaultValues,
    mode: "onBlur",
    reValidateMode: "onChange",
  });
  const selectedVehicleTypeId = useWatch({ control: form.control, name: "tipoVehiculoId" }) ?? "";

  const loadTransporte = async () => {
    try {
      setErrorMessage(null);
      setUnidades(await transporteService.list());
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    }
  };

  useEffect(() => {
    void (async () => {
      await Promise.all([loadTransporte(), tiposVehiculoService.listActive().then(setTiposVehiculo)]);
    })();
  }, []);

  const openCreateModal = () => {
    setSelectedUnidad(null);
    setSuccessMessage(null);
    form.reset(defaultValues);
    setIsFormModalOpen(true);
  };

  const openEditModal = (unidad: Transporte) => {
    setSelectedUnidad(unidad);
    setSuccessMessage(null);
    form.reset({
      empresa: unidad.empresa,
      tipoVehiculoId: unidad.tipoVehiculoId ?? "",
      tipoVehiculoNombreSnapshot: unidad.tipoVehiculoNombreSnapshot ?? "",
      motorista: unidad.motorista,
      telefonoMotorista: unidad.telefonoMotorista ?? "",
      marca: unidad.marca,
      modelo: unidad.modelo,
      anio: unidad.anio,
      placa: unidad.placa,
      capacidad: unidad.capacidad,
      activo: unidad.activo,
    });
    setIsFormModalOpen(true);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setSelectedUnidad(null);
    form.reset(defaultValues);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);
      const payload = {
        ...values,
        telefonoMotorista: values.telefonoMotorista?.trim() || undefined,
        anio: values.anio,
      };
      if (selectedUnidad) {
        await transporteService.update(selectedUnidad.id, payload);
        setSuccessMessage("Unidad actualizada exitosamente.");
      } else {
        await transporteService.create(payload);
        setSuccessMessage("Unidad registrada exitosamente.");
      }
      closeFormModal();
      await loadTransporte();
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    }
  });

  const handleDelete = async () => {
    if (!unidadToDelete) {
      return;
    }

    try {
      setErrorMessage(null);
      await softDeleteService.softDelete("transporte", unidadToDelete.id, {
        usuarioId: profile?.id ?? "sistema",
        usuarioEmail: profile?.email ?? "",
      });
      setUnidadToDelete(null);
      setSuccessMessage("Unidad eliminada del listado activo.");
      await loadTransporte();
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    }
  };

  return (
    <>
      <PageHeader title="Gestión de Transporte" description="Registro de flota y disponibilidad de vehículos." />
      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="font-heading text-lg">Listado de unidades</h3>
          <Button onClick={openCreateModal}>Agregar unidad</Button>
        </div>
        {errorMessage ? <p className="mb-3 text-sm text-danger">{errorMessage}</p> : null}
        {successMessage ? <p className="mb-3 text-sm text-success">{successMessage}</p> : null}
        <Table
          emptyMessage="No hay unidades registradas."
          headers={["Empresa", "Placa", "Capacidad", "Estado", "Acciones"]}
          rows={unidades.map((item) => ({
            key: item.id,
            cells: [
              item.empresa,
              item.placa,
              item.capacidad,
              item.activo ? "Activa" : "Inactiva",
              <TableActions key={`actions-${item.id}`} onDelete={() => setUnidadToDelete(item)} onEdit={() => openEditModal(item)} />,
            ],
          }))}
        />
      </Card>
      <Modal isOpen={isFormModalOpen} onClose={closeFormModal} size="lg" title={selectedUnidad ? "Editar unidad" : "Agregar unidad"}>
        <form className="space-y-3" onSubmit={(event) => void onSubmit(event)}>
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="Empresa" {...form.register("empresa")} error={form.formState.errors.empresa?.message} />
            <label className="flex flex-col gap-1 text-sm">
              <span>Tipo de vehículo</span>
              <select
                className="rounded-md border border-border px-3 py-2"
                value={selectedVehicleTypeId}
                onChange={(event) => {
                  const selected = tiposVehiculo.find((item) => item.id === event.target.value);
                  form.setValue("tipoVehiculoId", event.target.value);
                  form.setValue("tipoVehiculoNombreSnapshot", selected?.nombre ?? "");
                }}
              >
                <option value="">Selecciona tipo</option>
                {tiposVehiculo.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                  </option>
                ))}
              </select>
            </label>
            <input type="hidden" {...form.register("tipoVehiculoNombreSnapshot")} />
            <Input label="Motorista" {...form.register("motorista")} error={form.formState.errors.motorista?.message} />
            <Input
              label="Teléfono motorista"
              mask={formatPhone}
              {...form.register("telefonoMotorista")}
              error={form.formState.errors.telefonoMotorista?.message}
            />
            <Input label="Marca" {...form.register("marca")} error={form.formState.errors.marca?.message} />
            <Input label="Modelo" {...form.register("modelo")} error={form.formState.errors.modelo?.message} />
            <Input label="Placa" mask={formatPlate} {...form.register("placa")} error={form.formState.errors.placa?.message} />
            <Input
              label="Año"
              type="number"
              {...form.register("anio", { valueAsNumber: true })}
              error={form.formState.errors.anio?.message}
            />
            <Input
              label="Capacidad"
              type="number"
              {...form.register("capacidad", { valueAsNumber: true })}
              error={form.formState.errors.capacidad?.message}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...form.register("activo")} />
            Unidad activa
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={closeFormModal}>
              Cancelar
            </Button>
            <Button disabled={form.formState.isSubmitting} type="submit">
              {form.formState.isSubmitting ? "Guardando..." : selectedUnidad ? "Actualizar unidad" : "Guardar unidad"}
            </Button>
          </div>
        </form>
      </Modal>
      <Modal isOpen={Boolean(unidadToDelete)} onClose={() => setUnidadToDelete(null)} size="sm" title="Eliminar unidad">
        <p className="text-sm text-textDark">
          Se marcará como inactiva la unidad {unidadToDelete?.placa}. Los tours relacionados se conservarán.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setUnidadToDelete(null)}>
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
