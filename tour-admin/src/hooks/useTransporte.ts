import type { Transporte } from "@/types/transporte.types";
import { useModuleState } from "./useModuleState";

export function useTransporte() {
  return useModuleState<Transporte[]>([]);
}
