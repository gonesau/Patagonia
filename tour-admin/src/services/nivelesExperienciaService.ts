import type { NivelExperiencia } from "@/types/nivelExperiencia.types";
import { createCatalogService } from "./catalogServiceFactory";

export const nivelesExperienciaService = createCatalogService<NivelExperiencia>("nivelesExperiencia");
