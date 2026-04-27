import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import { transporteService } from "@/services/transporteService";
import { toServiceErrorMessage } from "@/services/serviceErrors";
import { transporteFormSchema, type TransporteFormValues } from "@/utils/validaciones";
import type { Transporte } from "@/types/transporte.types";

const defaultValues: TransporteFormValues = {
  empresa: "",
  motorista: "",
  marca: "",
  modelo: "",
  placa: "",
  capacidad: 0,
  costoPorTour: 0,
  activo: true,
};

export function TransportePage() {
  const [unidades, setUnidades] = useState<Transporte[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const form = useForm<TransporteFormValues>({
    resolver: zodResolver(transporteFormSchema),
    defaultValues,
  });

  const loadTransporte = async () => {
    try {
      setErrorMessage(null);
      setUnidades(await transporteService.list());
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    }
  };

  useEffect(() => {
    void loadTransporte();
  }, []);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await transporteService.create(values);
      form.reset(defaultValues);
      await loadTransporte();
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    }
  });

  return (
    <>
      <PageHeader title="Gestión de Transporte" description="Registro de flota, costos y disponibilidad." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <form className="space-y-3" onSubmit={(event) => void onSubmit(event)}>
            <Input label="Empresa" {...form.register("empresa")} error={form.formState.errors.empresa?.message} />
            <Input label="Motorista" {...form.register("motorista")} error={form.formState.errors.motorista?.message} />
            <Input label="Marca" {...form.register("marca")} error={form.formState.errors.marca?.message} />
            <Input label="Modelo" {...form.register("modelo")} error={form.formState.errors.modelo?.message} />
            <Input label="Placa" {...form.register("placa")} error={form.formState.errors.placa?.message} />
            <Input
              label="Capacidad"
              type="number"
              {...form.register("capacidad", { valueAsNumber: true })}
              error={form.formState.errors.capacidad?.message}
            />
            <Input
              label="Costo por tour"
              type="number"
              {...form.register("costoPorTour", { valueAsNumber: true })}
              error={form.formState.errors.costoPorTour?.message}
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...form.register("activo")} />
              Unidad activa
            </label>
            <Button type="submit" className="w-full">
              Guardar unidad
            </Button>
          </form>
        </Card>
        <Card>
          {errorMessage ? <p className="mb-3 text-sm text-danger">{errorMessage}</p> : null}
          <Table
            headers={["Empresa", "Placa", "Capacidad", "Costo"]}
            rows={unidades.map((item) => [item.empresa, item.placa, item.capacidad, `$${item.costoPorTour.toFixed(2)}`])}
          />
        </Card>
      </div>
    </>
  );
}
