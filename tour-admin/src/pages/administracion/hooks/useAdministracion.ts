import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { CatalogItem } from "@/types/catalog.types";
import type { CategoriaCompra } from "@/types/categoriaCompra.types";
import type { DificultadPlantilla } from "@/types/dificultadPlantilla.types";
import type { EstadoGuia } from "@/types/estadoGuia.types";
import type { EstadoTour } from "@/types/estadoTour.types";
import type { Guia } from "@/types/guia.types";
import type { MetodoPagoCatalogo } from "@/types/metodoPago.types";
import type { NivelExperiencia } from "@/types/nivelExperiencia.types";
import type { RelacionEmergencia } from "@/types/relacionEmergencia.types";
import type { Terreno } from "@/types/terreno.types";
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
import { softDeleteService, type SoftDeletableCollection } from "@/services/softDeleteService";
import { terrenosService } from "@/services/terrenosService";
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

interface TerrenosCatalogState {
  items: Terreno[];
  create: (data: Pick<Terreno, "nombre" | "descripcion" | "factor">) => Promise<void>;
  update: (
    id: string,
    data: Partial<Pick<Terreno, "nombre" | "descripcion" | "activo" | "factor">>,
  ) => Promise<void>;
  deactivate: (id: string) => Promise<void>;
  seedDefaults: () => Promise<number>;
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
  terrenos: TerrenosCatalogState;
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
  deleteUser: (userId: string) => Promise<void>;
}

export function useAdministracion(): AdministracionState {
  const { profile } = useAuth();
  const auditContext = useMemo(
    () => ({
      usuarioId: profile?.id ?? "sistema",
      usuarioEmail: profile?.email ?? "",
    }),
    [profile?.id, profile?.email],
  );
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
  const [terrenosItems, setTerrenosItems] = useState<Terreno[]>([]);
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
      terrenosData,
    ] = await Promise.all([
      usuariosSistemaService.listAll(),
      guiasService.list(),
      categoriasCompraService.listVisible(),
      tiposVehiculoService.listVisible(),
      relacionesEmergenciaService.listVisible(),
      estadosTourService.listVisible(),
      metodosPagoService.listVisible(),
      dificultadesPlantillaService.listVisible(),
      estadosGuiaService.listVisible(),
      nivelesExperienciaService.listVisible(),
      terrenosService.listVisible(),
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
    setTerrenosItems(terrenosData);
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

  const deleteUser = async (userId: string) => {
    await wrapMutation(async () => {
      await softDeleteService.softDelete("usuarios_sistema", userId, auditContext);
    });
  };

  const createCatalogState = <T extends CatalogItem>(
    items: T[],
    collectionName: SoftDeletableCollection,
    createFn: (data: Pick<T, "nombre" | "descripcion">) => Promise<void>,
    updateFn: (id: string, data: Partial<Pick<T, "nombre" | "descripcion" | "activo">>) => Promise<void>,
  ): CatalogState<T> => ({
    items,
    create: async (data) => {
      await wrapMutation(async () => createFn(data));
    },
    update: async (id, data) => {
      await wrapMutation(async () => updateFn(id, data));
    },
    deactivate: async (id) => {
      await wrapMutation(async () => softDeleteService.softDelete(collectionName, id, auditContext));
    },
  });

  const terrenosState: TerrenosCatalogState = {
    items: terrenosItems,
    create: async (data) => {
      await wrapMutation(async () => terrenosService.create(data));
    },
    update: async (id, data) => {
      await wrapMutation(async () => terrenosService.update(id, data));
    },
    deactivate: async (id) => {
      await wrapMutation(async () => softDeleteService.softDelete("terrenos", id, auditContext));
    },
    seedDefaults: async () => {
      let created = 0;
      await wrapMutation(async () => {
        created = await terrenosService.seedDefaults();
      });
      return created;
    },
  };

  return {
    users,
    guias,
    categoriasCompra: createCatalogState(
      categoriasCompraItems,
      "categoriasCompra",
      categoriasCompraService.create,
      categoriasCompraService.update,
    ),
    tiposVehiculo: createCatalogState(
      tiposVehiculoItems,
      "tiposVehiculo",
      tiposVehiculoService.create,
      tiposVehiculoService.update,
    ),
    relacionesEmergencia: createCatalogState(
      relacionesEmergenciaItems,
      "relacionesEmergencia",
      relacionesEmergenciaService.create,
      relacionesEmergenciaService.update,
    ),
    estadosTour: createCatalogState(
      estadosTourItems,
      "estadosTour",
      estadosTourService.create,
      estadosTourService.update,
    ),
    metodosPago: createCatalogState(
      metodosPagoItems,
      "metodosPago",
      metodosPagoService.create,
      metodosPagoService.update,
    ),
    dificultadesPlantilla: createCatalogState(
      dificultadesPlantillaItems,
      "dificultadesPlantilla",
      dificultadesPlantillaService.create,
      dificultadesPlantillaService.update,
    ),
    estadosGuia: createCatalogState(
      estadosGuiaItems,
      "estadosGuia",
      estadosGuiaService.create,
      estadosGuiaService.update,
    ),
    nivelesExperiencia: createCatalogState(
      nivelesExperienciaItems,
      "nivelesExperiencia",
      nivelesExperienciaService.create,
      nivelesExperienciaService.update,
    ),
    terrenos: terrenosState,
    isSubmitting,
    errorMessage,
    reload,
    createUser,
    updateUserRole,
    toggleUserActive,
    deleteUser,
  };
}
