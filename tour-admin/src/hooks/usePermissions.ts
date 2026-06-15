import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  can,
  getDefaultRoute,
  type PermissionAction,
  type PermissionResource,
} from "@/auth/permissions";

interface UsePermissionsResult {
  can: (action: PermissionAction, resource: PermissionResource) => boolean;
  canViewFinancial: boolean;
  isReadOnly: (resource: PermissionResource) => boolean;
  homeRoute: string;
}

export function usePermissions(): UsePermissionsResult {
  const { role } = useAuth();

  return useMemo<UsePermissionsResult>(
    () => ({
      can: (action, resource) => can(role, action, resource),
      canViewFinancial: can(role, "viewFinancial", "tours"),
      isReadOnly: (resource) => can(role, "view", resource) && !can(role, "manage", resource),
      homeRoute: getDefaultRoute(role),
    }),
    [role],
  );
}
