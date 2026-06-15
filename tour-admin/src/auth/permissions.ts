import type { UserRole } from "@/types/usuario.types";

export type PermissionAction = "view" | "manage" | "viewFinancial";

export type PermissionResource =
  | "dashboard"
  | "vagos"
  | "guias"
  | "transporte"
  | "tours"
  | "calendario"
  | "plantillas"
  | "compras"
  | "reportes"
  | "administracion"
  | "configuracion"
  | "backup";

type ResourcePermissions = Partial<Record<PermissionAction, boolean>>;

type RolePermissionMatrix = Record<UserRole, Record<PermissionResource, ResourcePermissions>>;

const fullAccess: ResourcePermissions = { view: true, manage: true, viewFinancial: true };
const noAccess: ResourcePermissions = {};

const PERMISSION_MATRIX: RolePermissionMatrix = {
  admin: {
    dashboard: fullAccess,
    vagos: fullAccess,
    guias: fullAccess,
    transporte: fullAccess,
    tours: fullAccess,
    calendario: fullAccess,
    plantillas: fullAccess,
    compras: fullAccess,
    reportes: fullAccess,
    administracion: fullAccess,
    configuracion: fullAccess,
    backup: fullAccess,
  },
  guia: {
    dashboard: { view: true },
    vagos: { view: true, manage: true },
    guias: noAccess,
    transporte: { view: true, manage: true },
    tours: { view: true },
    calendario: { view: true },
    plantillas: noAccess,
    compras: noAccess,
    reportes: noAccess,
    administracion: noAccess,
    configuracion: noAccess,
    backup: noAccess,
  },
  operador: {
    dashboard: noAccess,
    vagos: noAccess,
    guias: noAccess,
    transporte: noAccess,
    tours: { view: true },
    calendario: { view: true },
    plantillas: noAccess,
    compras: noAccess,
    reportes: noAccess,
    administracion: noAccess,
    configuracion: noAccess,
    backup: noAccess,
  },
};

const RESOURCE_ROUTE: Record<PermissionResource, string> = {
  dashboard: "/dashboard",
  vagos: "/vagos",
  guias: "/guias",
  transporte: "/transporte",
  tours: "/tours",
  calendario: "/calendario",
  plantillas: "/plantillas",
  compras: "/compras",
  reportes: "/reportes",
  administracion: "/administracion",
  configuracion: "/configuracion",
  backup: "/configuracion",
};

const DEFAULT_ROUTE_BY_ROLE: Record<UserRole, string> = {
  admin: "/dashboard",
  guia: "/calendario",
  operador: "/tours",
};

export function can(
  role: UserRole | null,
  action: PermissionAction,
  resource: PermissionResource,
): boolean {
  if (!role) {
    return false;
  }
  return PERMISSION_MATRIX[role][resource][action] === true;
}

export function getDefaultRoute(role: UserRole | null): string {
  if (!role) {
    return "/login";
  }
  return DEFAULT_ROUTE_BY_ROLE[role];
}

export function getViewableResources(role: UserRole | null): PermissionResource[] {
  if (!role) {
    return [];
  }
  return (Object.keys(RESOURCE_ROUTE) as PermissionResource[]).filter((resource) =>
    can(role, "view", resource),
  );
}

export function getResourceRoute(resource: PermissionResource): string {
  return RESOURCE_ROUTE[resource];
}
