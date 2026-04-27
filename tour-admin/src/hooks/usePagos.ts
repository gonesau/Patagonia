import type { Pago } from "@/types/pago.types";
import { useModuleState } from "./useModuleState";

export function usePagos() {
  return useModuleState<Pago[]>([]);
}
