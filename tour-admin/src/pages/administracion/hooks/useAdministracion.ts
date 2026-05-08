import { useCallback, useEffect, useState } from "react";
import type { CatalogItem } from "@/types/catalog.types";
import type { CategoriaCompra } from "@/types/categoriaCompra.types";
import type { DificultadPlantilla } from "@/types/dificultadPlantilla.types";
import type { EstadoGuia } from "@/types/estadoGuia.types";
import type { EstadoTour } from "@/types/estadoTour.types";
import type { Guia } from "@/types/guia.types";
import type { MetodoPagoCatalogo } from "@/types/metodoPago.types";
import type { NivelExperiencia } from "@/types/nivelExperiencia.types";
import type { RelacionEmergencia } from "@/types/relacionEmergencia.types";
import type { TipoVehiculo } from "@/types/tipoVehiculo.types";
import type { UserRole, UsuarioSistema } from "@/types/usuario.types";
import { categoriasCompraService } from "@/services/categoriasCompraService";
import { dificultadesPlantillaService } from "@/services/dificultadesPlantillaService";
import { estadosGuiaService } from "@/services/estadosGuiaService";
import { estadosTourService } from "@/services/estadosTourService";
import { guiasService } from "@/services/guiasService";
import { metodosPagoService } from "@/services/metodosPagoService";
import { nivelesExperienciaService } from "@/services/nivelesExperienciaService";
import { relacionesEmergenciaService } from "@/services/relacionesEmergenciaService";
import { tiposVehiculoService } from "@/services/tiposVehiculoService";
import { userProvisioningService } from "@/services/userProvisioningService";
import { usuariosSistemaService } from "@/services/usuariosSistemaService";
import { toServiceErrorMessage } from "@/services/serviceErrors";

interface CatalogState<T extends CatalogItem> {
  items: T[];
  create: (data: Pick<T, "nombre" | "descripcion">) => Promise<void>;
  update: (id: string, data: Partial<Pick<T, "nombre" | "descripcion" | "activo">>) => Promise<void>;
  deactivate: (id: string) => Promise<void>;
}

interface AdministracionState {
  users: UsuarioSistema[];
  guias: Guia[];
  categoriasCompra: CatalogState<CategoriaCompra>;
  tiposVehiculo: CatalogState<TipoVehiculo>;
  relacionesEmergencia: CatalogState<RelacionEmergencia>;
  estadosTour: CatalogState<EstadoTour>;
  metodosPago: CatalogState<MetodoPagoCatalogo>;
  dificultadesPlantilla: CatalogState<DificultadPlantilla>;
  estadosGuia: CatalogState<EstadoGuia>;
  nivelesExperiencia: CatalogState<NivelExperiencia>;
  isSubmitting: boolean;
  errorMessage: string | null;
  reload: () => Promise<void>;
  createUser: (payload: {
    email: string;
    nombre: string;
    rol: UserRole;
    guiaId?: string;
    sendInvitation: boolean;
  }) => Promise<void>;
  updateUserRole: (userId: string, role: UserRole) => Promise<void>;
  toggleUserActive: (userId: string, active: boolean) => Promise<void>;
}

export function useAdministracion(): AdministracionState {
  const [users, setUsers] = useState<UsuarioSistema[]>([]);
  const [guias, setGuias] = useState<Guia[]>([]);
  const [categoriasCompraItems, setCategoriasCompraItems] = useState<CategoriaCompra[]>([]);
  const [tiposVehiculoItems, setTiposVehiculoItems] = useState<TipoVehiculo[]>([]);
  const [relacionesEmergenciaItems, setRelacionesEmergenciaItems] = useState<RelacionEmergencia[]>([]);
  const [estadosTourItems, setEstadosTourItems] = useState<EstadoTour[]>([]);
  const [metodosPagoItems, setMetodosPagoItems] = useState<MetodoPagoCatalogo[]>([]);
  const [dificultadesPlantillaItems, setDificultadesPlantillaItems] = useState<DificultadPlantilla[]>([]);
  const [estadosGuiaItems, setEstadosGuiaItems] = useState<EstadoGuia[]>([]);
  const [nivelesExperienciaItems, setNivelesExperienciaItems] = useState<NivelExperiencia[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [
      usersData,
      guiasData,
      categoriasCompraData,
      tiposVehiculoData,
      relacionesEmergenciaData,
      estadosTourData,
      metodosPagoData,
      dificultadesPlantillaData,
      estadosGuiaData,
      nivelesExperienciaData,
    ] = await Promise.all([
      usuariosSistemaService.listAll(),
      guiasService.list(),
      categoriasCompraService.listAll(),
      tiposVehiculoService.listAll(),
      relacionesEmergenciaService.listAll(),
      estadosTourService.listAll(),
      metodosPagoService.listAll(),
      dificultadesPlantillaService.listAll(),
      estadosGuiaService.listAll(),
      nivelesExperienciaService.listAll(),
    ]);
    setUsers(usersData);
    setGuias(guiasData);
    setCategoriasCompraItems(categoriasCompraData);
    setTiposVehiculoItems(tiposVehiculoData);
    setRelacionesEmergenciaItems(relacionesEmergenciaData);
    setEstadosTourItems(estadosTourData);
    setMetodosPagoItems(metodosPagoData);
    setDificultadesPlantillaItems(dificultadesPlantillaData);
    setEstadosGuiaItems(estadosGuiaData);
    setNivelesExperienciaItems(nivelesExperienciaData);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          setErrorMessage(null);
          await reload();
        } catch (error) {
          setErrorMessage(toServiceErrorMessage(error));
        }
      })();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [reload]);

  const wrapMutation = async (callback: () => Promise<void>) => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await callback();
      await reload();
    } catch (error) {
      setErrorMessage(toServiceErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const createUser = async (payload: {
    email: string;
    nombre: string;
    rol: UserRole;
    guiaId?: string;
    sendInvitation: boolean;
  }) => {
    await wrapMutation(async () => {
      await userProvisioningService.createSystemUser(payload);
    });
  };

  const updateUserRole = async (userId: string, role: UserRole) => {
    await wrapMutation(async () => {
      await usuariosSistemaService.updateRole(userId, role);
    });
  };

  const toggleUserActive = async (userId: string, active: boolean) => {
    await wrapMutation(async () => {
      await usuariosSistemaService.updateActive(userId, active);
    });
  };

  const createCatalogState = <T extends CatalogItem>(
    items: T[],
    createFn: (data: Pick<T, "nombre" | "descripcion">) => Promise<void>,
    updateFn: (id: string, data: Partial<Pick<T, "nombre" | "descripcion" | "activo">>) => Promise<void>,
    deactivateFn: (id: string) => Promise<void>,
  ): CatalogState<T> => ({
    items,
    create: async (data) => {
      await wrapMutation(async () => createFn(data));
    },
    update: async (id, data) => {
      await wrapMutation(async () => updateFn(id, data));
    },
    deactivate: async (id) => {
      await wrapMutation(async () => deactivateFn(id));
    },
  });

  return {
    users,
    guias,
    categoriasCompra: createCatalogState(categoriasCompraItems, categoriasCompraService.create, categoriasCompraService.update, categoriasCompraService.remove),
    tiposVehiculo: createCatalogState(tiposVehiculoItems, tiposVehiculoService.create, tiposVehiculoService.update, tiposVehiculoService.remove),
    relacionesEmergencia: createCatalogState(relacionesEmergenciaItems, relacionesEmergenciaService.create, relacionesEmergenciaService.update, relacionesEmergenciaService.remove),
    estadosTour: createCatalogState(estadosTourItems, estadosTourService.create, estadosTourService.update, estadosTourService.remove),
    metodosPago: createCatalogState(metodosPagoItems, metodosPagoService.create, metodosPagoService.update, metodosPagoService.remove),
    dificultadesPlantilla: createCatalogState(
      dificultadesPlantillaItems,
      dificultadesPlantillaService.create,
      dificultadesPlantillaService.update,
      dificultadesPlantillaService.remove,
    ),
    estadosGuia: createCatalogState(estadosGuiaItems, estadosGuiaService.create, estadosGuiaService.update, estadosGuiaService.remove),
    nivelesExperiencia: createCatalogState(
      nivelesExperienciaItems,
      nivelesExperienciaService.create,
      nivelesExperienciaService.update,
      nivelesExperienciaService.remove,
    ),
    isSubmitting,
    errorMessage,
    reload,
    createUser,
    updateUserRole,
    toggleUserActive,
  };
}
