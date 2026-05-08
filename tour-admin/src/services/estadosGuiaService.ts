import type { EstadoGuia } from "@/types/estadoGuia.types";
import { createCatalogService } from "./catalogServiceFactory";

export const estadosGuiaService = createCatalogService<EstadoGuia>("estadosGuia");
