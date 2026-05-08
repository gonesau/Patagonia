import type { CategoriaCompra } from "@/types/categoriaCompra.types";
import { createCatalogService } from "./catalogServiceFactory";

export const categoriasCompraService = createCatalogService<CategoriaCompra>("categoriasCompra");
