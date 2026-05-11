import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { listRecentAuditLogs, type AuditLogEntry } from "@/services/auditoriaService";
import { toServiceErrorMessage } from "@/services/serviceErrors";
import { InactiveRecordsSection } from "./InactiveRecordsSection";

type AuditTab = "logs" | "inactivos";

const TAB_OPTIONS: ReadonlyArray<{ id: AuditTab; label: string }> = [
  { id: "logs", label: "Logs" },
  { id: "inactivos", label: "Registros inactivos" },
];

function AuditLogsPanel() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const load = async () => {
      try {
        setErrorMessage(null);
        setEntries(await listRecentAuditLogs(120));
      } catch (error) {
        setErrorMessage(toServiceErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <Card>
      <h2 className="mb-2 font-heading text-lg text-textDark">Registro de auditoría</h2>
      <p className="mb-4 text-sm text-neutral">
        Últimas acciones registradas en el sistema (exportaciones, correos, cambios de configuración, etc.).
      </p>
      {errorMessage ? <p className="mb-3 text-sm text-danger">{errorMessage}</p> : null}
      {isLoading ? <p className="text-sm text-neutral">Cargando…</p> : null}
      {!isLoading && !entries.length ? (
        <p className="text-sm text-neutral">No hay entradas registradas.</p>
      ) : null}
      {!isLoading && entries.length > 0 ? (
        <div className="max-h-[480px] overflow-auto rounded-md border border-border">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-surface">
              <tr className="border-b border-border text-xs uppercase text-neutral">
                <th className="px-3 py-2 font-medium">Fecha</th>
                <th className="px-3 py-2 font-medium">Usuario</th>
                <th className="px-3 py-2 font-medium">Acción</th>
                <th className="px-3 py-2 font-medium">Entidad</th>
                <th className="px-3 py-2 font-medium">Id</th>
                <th className="px-3 py-2 font-medium">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((row) => (
                <tr key={row.id} className="border-b border-border/80">
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-textDark">
                    {row.timestamp instanceof Date && !Number.isNaN(row.timestamp.getTime())
                      ? row.timestamp.toLocaleString("es-SV")
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-textDark">{row.usuarioEmail}</td>
                  <td className="px-3 py-2 text-textDark">{row.accion}</td>
                  <td className="px-3 py-2 text-textDark">{row.entidad}</td>
                  <td className="max-w-[140px] truncate px-3 py-2 font-mono text-xs text-neutral">{row.entidadId}</td>
                  <td className="px-3 py-2 text-textDark">{row.detalle ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </Card>
  );
}

export function AuditoriaAdminSection() {
  const [activeTab, setActiveTab] = useState<AuditTab>("logs");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 rounded-md border border-border bg-white p-2">
        {TAB_OPTIONS.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                isActive
                  ? "bg-primary text-textLight"
                  : "bg-transparent text-textDark hover:bg-primary/10"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {activeTab === "logs" ? <AuditLogsPanel /> : <InactiveRecordsSection />}
    </div>
  );
}
