import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import { useAuth } from "@/hooks/useAuth";
import { plantillasService } from "@/services/plantillasService";
import { toServiceErrorMessage } from "@/services/serviceErrors";
import { plantillaFormSchema, type PlantillaFormValues } from "@/utils/validaciones";
import type { TourPlantilla } from "@/types/tour.types";

const defaultValues: PlantillaFormValues = {
  nombre: "",
  descripcion: "",
  dificultad: "moderado",
  precioBase: 0,
  activa: true,
};

export function PlantillasPage() {
  const { profile } = useAuth();
  const [plantillas, setPlantillas] = useState<TourPlantilla[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const form = useForm<PlantillaFormValues>({
    resolver: zodResolver(plantillaFormSchema),
    defaultValues,
  });

  const loadPlantillas = async () => {
    try {
      setErrorMessage(null);
      setPlantillas(await plantillasService.list());
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    }
  };

  useEffect(() => {
    void loadPlantillas();
  }, []);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await plantillasService.create({
        ...values,
        creadoPor: profile?.id ?? "sistema",
      });
      form.reset(defaultValues);
      await loadPlantillas();
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    }
  });

  return (
    <>
      <PageHeader title="Plantillas de Tour" description="Ficha maestra para crear ocurrencias reutilizables." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <form className="space-y-3" onSubmit={(event) => void onSubmit(event)}>
            <Input label="Nombre" {...form.register("nombre")} error={form.formState.errors.nombre?.message} />
            <label className="flex flex-col gap-1 text-sm">
              <span>Descripción</span>
              <textarea className="min-h-28 rounded-md border border-border px-3 py-2" {...form.register("descripcion")} />
              {form.formState.errors.descripcion?.message ? (
                <span className="text-danger">{form.formState.errors.descripcion.message}</span>
              ) : null}
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>Dificultad</span>
              <select className="rounded-md border border-border px-3 py-2" {...form.register("dificultad")}>
                <option value="muy_facil">Muy fácil</option>
                <option value="facil">Fácil</option>
                <option value="moderado">Moderado</option>
                <option value="dificil">Difícil</option>
                <option value="muy_dificil">Muy difícil</option>
              </select>
            </label>
            <Input
              label="Precio base"
              type="number"
              {...form.register("precioBase", { valueAsNumber: true })}
              error={form.formState.errors.precioBase?.message}
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...form.register("activa")} />
              Plantilla activa
            </label>
            <Button type="submit" className="w-full">
              Guardar plantilla
            </Button>
          </form>
        </Card>
        <Card>
          {errorMessage ? <p className="mb-3 text-sm text-danger">{errorMessage}</p> : null}
          <Table
            headers={["Nombre", "Dificultad", "Precio base", "Estado"]}
            rows={plantillas.map((item) => [
              item.nombre,
              item.dificultad,
              `$${item.precioBase.toFixed(2)}`,
              item.activa ? "Activa" : "Inactiva",
            ])}
          />
        </Card>
      </div>
    </>
  );
}
