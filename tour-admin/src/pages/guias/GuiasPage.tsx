import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import { guiasService } from "@/services/guiasService";
import { toServiceErrorMessage } from "@/services/serviceErrors";
import { guiaFormSchema, type GuiaFormValues } from "@/utils/validaciones";
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
  const form = useForm<GuiaFormValues>({ resolver: zodResolver(guiaFormSchema), defaultValues });

  const loadGuias = async () => {
    try {
      setErrorMessage(null);
      setGuias(await guiasService.list());
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    }
  };

  useEffect(() => {
    void loadGuias();
  }, []);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await guiasService.create(values);
      form.reset(defaultValues);
      await loadGuias();
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    }
  });

  return (
    <>
      <PageHeader title="Gestión de Guías" description="Registro de guías con estado operativo y datos críticos." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <form className="space-y-3" onSubmit={(event) => void onSubmit(event)}>
            <Input label="Nombre" {...form.register("nombre")} error={form.formState.errors.nombre?.message} />
            <Input label="Apellido" {...form.register("apellido")} error={form.formState.errors.apellido?.message} />
            <Input label="DUI" {...form.register("dui")} error={form.formState.errors.dui?.message} />
            <Input label="Email" {...form.register("email")} error={form.formState.errors.email?.message} />
            <Input label="Teléfono" {...form.register("telefono")} error={form.formState.errors.telefono?.message} />
            <Input
              label="Contacto emergencia"
              {...form.register("contactoEmergenciaNombre")}
              error={form.formState.errors.contactoEmergenciaNombre?.message}
            />
            <Input
              label="Tel. emergencia"
              {...form.register("contactoEmergenciaTel")}
              error={form.formState.errors.contactoEmergenciaTel?.message}
            />
            <label className="flex flex-col gap-1 text-sm">
              <span>Estado</span>
              <select className="rounded-md border border-border px-3 py-2" {...form.register("estado")}>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
                <option value="suspendido">Suspendido</option>
              </select>
            </label>
            <Button type="submit" className="w-full">
              Guardar guía
            </Button>
          </form>
        </Card>
        <Card>
          {errorMessage ? <p className="mb-3 text-sm text-danger">{errorMessage}</p> : null}
          <Table
            headers={["Nombre", "Email", "Teléfono", "Estado"]}
            rows={guias.map((guia) => [
              `${guia.nombre} ${guia.apellido}`,
              guia.email,
              guia.telefono,
              guia.estado,
            ])}
          />
        </Card>
      </div>
    </>
  );
}
