import type { DificultadPlantilla } from "@/types/dificultadPlantilla.types";
import { createCatalogService } from "./catalogServiceFactory";

export const dificultadesPlantillaService = createCatalogService<DificultadPlantilla>("dificultadesPlantilla");
