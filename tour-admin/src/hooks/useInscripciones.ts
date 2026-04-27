import type { Inscripcion } from "@/types/inscripcion.types";
import { useModuleState } from "./useModuleState";

export function useInscripciones() {
  return useModuleState<Inscripcion[]>([]);
}
