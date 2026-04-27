import type { TourOcurrencia } from "@/types/tour.types";
import { useModuleState } from "./useModuleState";

export function useTours() {
  return useModuleState<TourOcurrencia[]>([]);
}
