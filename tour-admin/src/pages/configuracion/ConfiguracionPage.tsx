import { useEffect, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { configuracionService } from "@/services/configuracionService";
import { registerAuditLog } from "@/services/auditoriaService";
import { toServiceErrorMessage } from "@/services/serviceErrors";
import { useAuth } from "@/hooks/useAuth";
import type { ConfiguracionGlobal } from "@/types/config.types";
import { BackupSection } from "./components/BackupSection";

const emptyPlantillas = {
  confirmacionCuerpoHtml: "",
  recordatorio7dCuerpoHtml: "",
  recordatorio1dCuerpoHtml: "",
  linkFotosCuerpoHtml: "",
};

export function ConfiguracionPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.rol === "admin";
  const [config, setConfig] = useState<ConfiguracionGlobal | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    const load = async () => {
      try {
        setErrorMessage(null);
        setConfig(await configuracionService.get());
      } catch (error) {
        setErrorMessage(toServiceErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  const plantillas = config?.plantillasEmail ?? emptyPlantillas;

  const handleChange = (field: keyof Omit<ConfiguracionGlobal, "id" | "plantillasEmail">, value: string) => {
    setConfig((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handlePlantillaChange = (field: keyof typeof emptyPlantillas, value: string) => {
    setConfig((prev) =>
      prev
        ? {
            ...prev,
            plantillasEmail: { ...emptyPlantillas, ...prev.plantillasEmail, [field]: value },
          }
        : prev,
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!config || !profile || !isAdmin) {
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await configuracionService.save({
        nombreEmpresa: config.nombreEmpresa,
        logoUrl: config.logoUrl || undefined,
        emailContacto: config.emailContacto || undefined,
        driveCarpetaRaizId: config.driveCarpetaRaizId || undefined,
        plantillasEmail: {
          confirmacionCuerpoHtml: plantillas.confirmacionCuerpoHtml || undefined,
          recordatorio7dCuerpoHtml: plantillas.recordatorio7dCuerpoHtml || undefined,
          recordatorio1dCuerpoHtml: plantillas.recordatorio1dCuerpoHtml || undefined,
          linkFotosCuerpoHtml: plantillas.linkFotosCuerpoHtml || undefined,
        },
      });
      await registerAuditLog({
        usuarioId: profile.id,
        usuarioEmail: profile.email,
        accion: "update",
        entidad: "configuracion",
        entidadId: "global",
      });
      setSuccessMessage("Configuración guardada correctamente.");
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Configuración del sistema"
        description="Datos de la empresa, logo, integración con Drive y plantillas HTML opcionales para correos (las funciones usan valores por defecto si deja vacío)."
      />
      {errorMessage ? <p className="mb-3 text-sm text-danger">{errorMessage}</p> : null}
      {successMessage ? <p className="mb-3 text-sm text-primary">{successMessage}</p> : null}
      {!isAdmin ? (
        <p className="mb-3 text-sm text-neutral">Solo administradores pueden modificar esta configuración.</p>
      ) : null}
      {isLoading || !config ? (
        <p className="text-sm text-neutral">Cargando…</p>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)}>
          <Card>
            <h2 className="mb-4 font-heading text-lg text-textDark">General</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Nombre empresa"
                value={config.nombreEmpresa}
                onChange={(e) => handleChange("nombreEmpresa", e.target.value)}
                disabled={!isAdmin}
                required
              />
              <Input
                label="Correo de contacto"
                type="email"
                value={config.emailContacto ?? ""}
                onChange={(e) => handleChange("emailContacto", e.target.value)}
                disabled={!isAdmin}
              />
              <div className="md:col-span-2">
                <Input
                  label="URL del logo (HTTPS)"
                  value={config.logoUrl ?? ""}
                  onChange={(e) => handleChange("logoUrl", e.target.value)}
                  disabled={!isAdmin}
                  placeholder="https://..."
                />
              </div>
              <div className="md:col-span-2">
                <Input
                  label="ID carpeta raíz en Google Drive"
                  value={config.driveCarpetaRaizId ?? ""}
                  onChange={(e) => handleChange("driveCarpetaRaizId", e.target.value)}
                  disabled={!isAdmin}
                />
              </div>
            </div>
          </Card>

          <div className="mt-4">
            <Card>
              <h2 className="mb-4 font-heading text-lg text-textDark">Plantillas de correo (HTML)</h2>
              <p className="mb-4 text-sm text-neutral">
                Fragmentos opcionales que Cloud Functions pueden combinar con datos del tour. Deje vacío para usar el
                contenido predeterminado del servidor.
              </p>
              <div className="grid gap-4">
                <label className="flex flex-col gap-1 text-sm">
                  <span>Confirmación de inscripción</span>
                  <textarea
                    className="min-h-[100px] rounded-md border border-border px-3 py-2 font-mono text-xs"
                    value={plantillas.confirmacionCuerpoHtml ?? ""}
                    onChange={(e) => handlePlantillaChange("confirmacionCuerpoHtml", e.target.value)}
                    disabled={!isAdmin}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span>Recordatorio 7 días</span>
                  <textarea
                    className="min-h-[100px] rounded-md border border-border px-3 py-2 font-mono text-xs"
                    value={plantillas.recordatorio7dCuerpoHtml ?? ""}
                    onChange={(e) => handlePlantillaChange("recordatorio7dCuerpoHtml", e.target.value)}
                    disabled={!isAdmin}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span>Recordatorio 1 día</span>
                  <textarea
                    className="min-h-[100px] rounded-md border border-border px-3 py-2 font-mono text-xs"
                    value={plantillas.recordatorio1dCuerpoHtml ?? ""}
                    onChange={(e) => handlePlantillaChange("recordatorio1dCuerpoHtml", e.target.value)}
                    disabled={!isAdmin}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span>Enlace a fotos</span>
                  <textarea
                    className="min-h-[100px] rounded-md border border-border px-3 py-2 font-mono text-xs"
                    value={plantillas.linkFotosCuerpoHtml ?? ""}
                    onChange={(e) => handlePlantillaChange("linkFotosCuerpoHtml", e.target.value)}
                    disabled={!isAdmin}
                  />
                </label>
              </div>
            </Card>
          </div>

          {isAdmin ? (
            <div className="mt-4">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Guardando…" : "Guardar configuración"}
              </Button>
            </div>
          ) : null}
        </form>
      )}
      {isAdmin ? <BackupSection /> : null}
    </>
  );
}
