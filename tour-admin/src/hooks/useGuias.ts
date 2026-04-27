import type { Guia } from "@/types/guia.types";
import { useModuleState } from "./useModuleState";

export function useGuias() {
  return useModuleState<Guia[]>([]);
}
