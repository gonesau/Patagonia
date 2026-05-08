import type { RelacionEmergencia } from "@/types/relacionEmergencia.types";
import { createCatalogService } from "./catalogServiceFactory";

export const relacionesEmergenciaService = createCatalogService<RelacionEmergencia>("relacionesEmergencia");
