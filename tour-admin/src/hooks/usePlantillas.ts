import type { TourPlantilla } from "@/types/tour.types";
import { useModuleState } from "./useModuleState";

export function usePlantillas() {
  return useModuleState<TourPlantilla[]>([]);
}
