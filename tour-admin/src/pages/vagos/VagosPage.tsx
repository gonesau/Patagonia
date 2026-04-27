import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Table } from "@/components/ui/Table";
import { useAuth } from "@/hooks/useAuth";
import { vagosService } from "@/services/vagosService";
import { toServiceErrorMessage } from "@/services/serviceErrors";
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
  const form = useForm<VagoFormValues>({ resolver: zodResolver(vagoFormSchema), defaultValues });

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

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await vagosService.create({
        ...values,
        nivelExperiencia: "principiante",
        activo: true,
        creadoPor: profile?.id ?? "sistema",
      });
      form.reset(defaultValues);
      await loadVagos(searchTerm);
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    }
  });

  return (
    <>
      <PageHeader title="Gestión de Vagos" description="Registro y búsqueda de vagos con Firestore en tiempo real." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <form className="space-y-3" onSubmit={(event) => void onSubmit(event)}>
            <Input label="Nombre" {...form.register("nombre")} error={form.formState.errors.nombre?.message} />
            <Input label="Apellido" {...form.register("apellido")} error={form.formState.errors.apellido?.message} />
            <Input label="Email" {...form.register("email")} error={form.formState.errors.email?.message} />
            <Input label="Teléfono" {...form.register("telefono")} error={form.formState.errors.telefono?.message} />
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
              {...form.register("contactoEmergenciaTel")}
              error={form.formState.errors.contactoEmergenciaTel?.message}
            />
            <Button type="submit" className="w-full">
              Guardar vago
            </Button>
          </form>
        </Card>
        <Card>
          <div className="mb-3">
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
          {errorMessage ? <p className="mb-3 text-sm text-danger">{errorMessage}</p> : null}
          {isLoading ? (
            <p className="text-sm text-neutral">Cargando vagos...</p>
          ) : (
            <Table
              headers={["Nombre", "Teléfono", "Email", "Estado"]}
              rows={vagos.map((vago) => [
                `${vago.nombre} ${vago.apellido}`,
                vago.telefono,
                vago.email,
                vago.activo ? "Activo" : "Inactivo",
              ])}
            />
          )}
        </Card>
      </div>
    </>
  );
}
