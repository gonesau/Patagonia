import { httpsCallable } from "firebase/functions";
import type { UserRole } from "@/types/usuario.types";
import { functions } from "./firebase";

export interface CreateSystemUserPayload {
  email: string;
  nombre: string;
  rol: UserRole;
  guiaId?: string;
  sendInvitation: boolean;
}

export const userProvisioningService = {
  async createSystemUser(payload: CreateSystemUserPayload): Promise<{ uid: string; invitationSent: boolean }> {
    const callable = httpsCallable(functions, "createSystemUser");
    const result = await callable(payload);
    return result.data as { uid: string; invitationSent: boolean };
  },
};
