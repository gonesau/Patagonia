import { PageHeader } from "@/components/layout/PageHeader";
import { CatalogCrudSection } from "./components/CatalogCrudSection";
import { UsersAdminSection } from "./components/UsersAdminSection";
import { useAdministracion } from "./hooks/useAdministracion";

export function AdministracionPage() {
  const adminState = useAdministracion();

  return (
    <>
      <PageHeader
        title="Administración"
        description="Administra usuarios, roles y catálogos operativos del sistema."
      />
      {adminState.errorMessage ? <p className="mb-4 rounded-md bg-danger/10 p-3 text-sm text-danger">{adminState.errorMessage}</p> : null}
      <div className="space-y-6">
        <UsersAdminSection
          users={adminState.users}
          guias={adminState.guias}
          isSubmitting={adminState.isSubmitting}
          onCreate={adminState.createUser}
          onUpdateRole={adminState.updateUserRole}
          onToggleActive={adminState.toggleUserActive}
        />
        <CatalogCrudSection
          title="Categorías de compra"
          items={adminState.categoriasCompra.items}
          isSubmitting={adminState.isSubmitting}
          onCreate={adminState.categoriasCompra.create}
          onUpdate={adminState.categoriasCompra.update}
          onDeactivate={adminState.categoriasCompra.deactivate}
        />
        <CatalogCrudSection
          title="Tipos de vehículo"
          items={adminState.tiposVehiculo.items}
          isSubmitting={adminState.isSubmitting}
          onCreate={adminState.tiposVehiculo.create}
          onUpdate={adminState.tiposVehiculo.update}
          onDeactivate={adminState.tiposVehiculo.deactivate}
        />
        <CatalogCrudSection
          title="Relación contacto de emergencia"
          items={adminState.relacionesEmergencia.items}
          isSubmitting={adminState.isSubmitting}
          onCreate={adminState.relacionesEmergencia.create}
          onUpdate={adminState.relacionesEmergencia.update}
          onDeactivate={adminState.relacionesEmergencia.deactivate}
        />
        <CatalogCrudSection
          title="Estados de tour"
          items={adminState.estadosTour.items}
          isSubmitting={adminState.isSubmitting}
          onCreate={adminState.estadosTour.create}
          onUpdate={adminState.estadosTour.update}
          onDeactivate={adminState.estadosTour.deactivate}
        />
        <CatalogCrudSection
          title="Métodos de pago"
          items={adminState.metodosPago.items}
          isSubmitting={adminState.isSubmitting}
          onCreate={adminState.metodosPago.create}
          onUpdate={adminState.metodosPago.update}
          onDeactivate={adminState.metodosPago.deactivate}
        />
        <CatalogCrudSection
          title="Dificultad de plantilla"
          items={adminState.dificultadesPlantilla.items}
          isSubmitting={adminState.isSubmitting}
          onCreate={adminState.dificultadesPlantilla.create}
          onUpdate={adminState.dificultadesPlantilla.update}
          onDeactivate={adminState.dificultadesPlantilla.deactivate}
        />
        <CatalogCrudSection
          title="Estado de guía"
          items={adminState.estadosGuia.items}
          isSubmitting={adminState.isSubmitting}
          onCreate={adminState.estadosGuia.create}
          onUpdate={adminState.estadosGuia.update}
          onDeactivate={adminState.estadosGuia.deactivate}
        />
        <CatalogCrudSection
          title="Nivel de experiencia de vago"
          items={adminState.nivelesExperiencia.items}
          isSubmitting={adminState.isSubmitting}
          onCreate={adminState.nivelesExperiencia.create}
          onUpdate={adminState.nivelesExperiencia.update}
          onDeactivate={adminState.nivelesExperiencia.deactivate}
        />
      </div>
    </>
  );
}
