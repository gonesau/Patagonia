import type { MetodoPagoCatalogo } from "@/types/metodoPago.types";
import { createCatalogService } from "./catalogServiceFactory";

export const metodosPagoService = createCatalogService<MetodoPagoCatalogo>("metodosPago");
