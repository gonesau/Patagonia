import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { CatalogCrudSection } from "./components/CatalogCrudSection";
import { TerrenosCrudSection } from "./components/TerrenosCrudSection";
import { UsersAdminSection } from "./components/UsersAdminSection";
import { AuditoriaAdminSection } from "./components/AuditoriaAdminSection";
import { useAdministracion } from "./hooks/useAdministracion";

type AdminTabId =
  | "usuarios"
  | "auditoria"
  | "categoriasCompra"
  | "tiposVehiculo"
  | "relacionesEmergencia"
  | "estadosTour"
  | "metodosPago"
  | "dificultadesPlantilla"
  | "estadosGuia"
  | "nivelesExperiencia"
  | "terrenos";

interface AdminTab {
  id: AdminTabId;
  label: string;
}

const ADMIN_TAB_STORAGE_KEY = "administracion.activeTab";

const tabs: AdminTab[] = [
  { id: "usuarios", label: "Usuarios y roles" },
  { id: "auditoria", label: "Auditoría" },
  { id: "categoriasCompra", label: "Categorías de compra" },
  { id: "tiposVehiculo", label: "Tipos de vehículo" },
  { id: "relacionesEmergencia", label: "Relación de emergencia" },
  { id: "estadosTour", label: "Estados de tour" },
  { id: "metodosPago", label: "Métodos de pago" },
  { id: "dificultadesPlantilla", label: "Dificultad de plantilla" },
  { id: "estadosGuia", label: "Estado de guía" },
  { id: "nivelesExperiencia", label: "Nivel de experiencia" },
  { id: "terrenos", label: "Terrenos" },
];

export function AdministracionPage() {
  const adminState = useAdministracion();
  const [activeTab, setActiveTab] = useState<AdminTabId>(() => {
    if (typeof window === "undefined") {
      return "usuarios";
    }
    const savedTab = window.localStorage.getItem(ADMIN_TAB_STORAGE_KEY);
    return tabs.some((item) => item.id === savedTab) ? (savedTab as AdminTabId) : "usuarios";
  });

  useEffect(() => {
    window.localStorage.setItem(ADMIN_TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);

  const activeTabPanel = useMemo(() => {
    if (activeTab === "usuarios") {
      return (
        <UsersAdminSection
          users={adminState.users}
          guias={adminState.guias}
          isSubmitting={adminState.isSubmitting}
          onCreate={adminState.createUser}
          onUpdateRole={adminState.updateUserRole}
          onToggleActive={adminState.toggleUserActive}
          onDelete={adminState.deleteUser}
        />
      );
    }
    if (activeTab === "auditoria") {
      return <AuditoriaAdminSection />;
    }
    if (activeTab === "categoriasCompra") {
      return (
        <CatalogCrudSection
          title="Categorías de compra"
          items={adminState.categoriasCompra.items}
          isSubmitting={adminState.isSubmitting}
          onCreate={adminState.categoriasCompra.create}
          onUpdate={adminState.categoriasCompra.update}
          onDeactivate={adminState.categoriasCompra.deactivate}
        />
      );
    }
    if (activeTab === "tiposVehiculo") {
      return (
        <CatalogCrudSection
          title="Tipos de vehículo"
          items={adminState.tiposVehiculo.items}
          isSubmitting={adminState.isSubmitting}
          onCreate={adminState.tiposVehiculo.create}
          onUpdate={adminState.tiposVehiculo.update}
          onDeactivate={adminState.tiposVehiculo.deactivate}
        />
      );
    }
    if (activeTab === "relacionesEmergencia") {
      return (
        <CatalogCrudSection
          title="Relación contacto de emergencia"
          items={adminState.relacionesEmergencia.items}
          isSubmitting={adminState.isSubmitting}
          onCreate={adminState.relacionesEmergencia.create}
          onUpdate={adminState.relacionesEmergencia.update}
          onDeactivate={adminState.relacionesEmergencia.deactivate}
        />
      );
    }
    if (activeTab === "estadosTour") {
      return (
        <CatalogCrudSection
          title="Estados de tour"
          items={adminState.estadosTour.items}
          isSubmitting={adminState.isSubmitting}
          onCreate={adminState.estadosTour.create}
          onUpdate={adminState.estadosTour.update}
          onDeactivate={adminState.estadosTour.deactivate}
        />
      );
    }
    if (activeTab === "metodosPago") {
      return (
        <CatalogCrudSection
          title="Métodos de pago"
          items={adminState.metodosPago.items}
          isSubmitting={adminState.isSubmitting}
          onCreate={adminState.metodosPago.create}
          onUpdate={adminState.metodosPago.update}
          onDeactivate={adminState.metodosPago.deactivate}
        />
      );
    }
    if (activeTab === "dificultadesPlantilla") {
      return (
        <CatalogCrudSection
          title="Dificultad de plantilla"
          items={adminState.dificultadesPlantilla.items}
          isSubmitting={adminState.isSubmitting}
          onCreate={adminState.dificultadesPlantilla.create}
          onUpdate={adminState.dificultadesPlantilla.update}
          onDeactivate={adminState.dificultadesPlantilla.deactivate}
        />
      );
    }
    if (activeTab === "estadosGuia") {
      return (
        <CatalogCrudSection
          title="Estado de guía"
          items={adminState.estadosGuia.items}
          isSubmitting={adminState.isSubmitting}
          onCreate={adminState.estadosGuia.create}
          onUpdate={adminState.estadosGuia.update}
          onDeactivate={adminState.estadosGuia.deactivate}
        />
      );
    }
    if (activeTab === "nivelesExperiencia") {
      return (
        <CatalogCrudSection
          title="Nivel de experiencia de vago"
          items={adminState.nivelesExperiencia.items}
          isSubmitting={adminState.isSubmitting}
          onCreate={adminState.nivelesExperiencia.create}
          onUpdate={adminState.nivelesExperiencia.update}
          onDeactivate={adminState.nivelesExperiencia.deactivate}
        />
      );
    }

    return (
      <TerrenosCrudSection
        title="Terrenos"
        items={adminState.terrenos.items}
        isSubmitting={adminState.isSubmitting}
        onCreate={adminState.terrenos.create}
        onUpdate={adminState.terrenos.update}
        onDeactivate={adminState.terrenos.deactivate}
        onSeedDefaults={adminState.terrenos.seedDefaults}
      />
    );
  }, [activeTab, adminState]);

  return (
    <>
      <PageHeader
        title="Administración"
        description="Administra usuarios, roles y catálogos operativos del sistema."
      />
      {adminState.errorMessage ? <p className="mb-4 rounded-md bg-danger/10 p-3 text-sm text-danger">{adminState.errorMessage}</p> : null}
      <div className="mb-4 rounded-md border border-border bg-white p-3">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,320px)] sm:items-end">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-neutral">Sección actual</p>
            <p className="truncate font-medium text-textDark">{tabs.find((tab) => tab.id === activeTab)?.label}</p>
          </div>
          <label className="flex min-w-0 flex-col gap-1 text-sm text-textDark">
            <span>Cambiar sección</span>
            <select
              className="w-full rounded-md border border-border bg-white px-3 py-2"
              value={activeTab}
              onChange={(event) => setActiveTab(event.target.value as AdminTabId)}
            >
              {tabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="min-w-0">
        {activeTabPanel}
      </div>
    </>
  );
}
