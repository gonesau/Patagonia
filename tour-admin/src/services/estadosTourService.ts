import type { EstadoTour } from "@/types/estadoTour.types";
import { createCatalogService } from "./catalogServiceFactory";

export const estadosTourService = createCatalogService<EstadoTour>("estadosTour");
