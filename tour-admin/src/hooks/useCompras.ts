import type { Compra } from "@/types/compra.types";
import { useModuleState } from "./useModuleState";

export function useCompras() {
  return useModuleState<Compra[]>([]);
}
