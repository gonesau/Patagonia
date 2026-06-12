import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
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
        <div className="max-h-[480px] overflow-y-auto">
          <Table
            emptyMessage="No hay entradas registradas."
            headers={["Fecha", "Usuario", "Acción", "Entidad", "Id", "Detalle"]}
            mobileHiddenColumnIndexes={[4]}
            rows={entries.map((row) => ({
              key: row.id,
              cells: [
                <span key={`fecha-${row.id}`} className="font-mono text-xs">
                  {row.timestamp instanceof Date && !Number.isNaN(row.timestamp.getTime())
                    ? row.timestamp.toLocaleString("es-SV")
                    : "—"}
                </span>,
                row.usuarioEmail,
                row.accion,
                row.entidad,
                <span key={`id-${row.id}`} className="max-w-[140px] truncate font-mono text-xs text-neutral">
                  {row.entidadId}
                </span>,
                row.detalle ?? "—",
              ],
            }))}
          />
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
