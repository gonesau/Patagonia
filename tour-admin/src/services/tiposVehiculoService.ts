import type { TipoVehiculo } from "@/types/tipoVehiculo.types";
import { createCatalogService } from "./catalogServiceFactory";

export const tiposVehiculoService = createCatalogService<TipoVehiculo>("tiposVehiculo");
