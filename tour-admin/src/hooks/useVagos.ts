import type { Vago } from "@/types/vago.types";
import { useModuleState } from "./useModuleState";

export function useVagos() {
  return useModuleState<Vago[]>([]);
}
