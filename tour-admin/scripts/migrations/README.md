# Migraciones de datos

Scripts de migración explícita para uniformar datos legacy.

## Requisitos

- Credenciales de Firebase Admin disponibles en el entorno.
- Proyecto configurado con permisos de escritura en Firestore.

## Ejecución

### Dry run

```bash
node scripts/migrations/run-migrations.mjs --dry-run
```

### Ejecución real

```bash
node scripts/migrations/run-migrations.mjs
```

## Migraciones incluidas

1. `001-migrate-legacy-compras.mjs`
   - Migra `tours/{tourId}/compras` a colección raíz `compras`.
   - Idempotente por `legacyCompraRef`.
2. `002-backfill-catalog-references.mjs`
   - Backfill de referencias de catálogo en `vagos`, `transporte`, `guias`, `tour_plantillas`, `tours`, `pagos`.
3. `003-seed-default-catalogs.mjs`
   - Si no existen registros, crea catálogos base para operación.
4. `004-seed-terrenos.mjs`
   - Si la colección `terrenos` está vacía, siembra los 7 terrenos estandarizados (`pavimento`, `tierra compacta`, `bosque con raíces`, `piedra suelta`, `lodo / arcilla`, `ceniza volcánica`, `roca / trepada técnica`) con sus factores oficiales (1.0 a 1.5). Necesario para que el algoritmo de clasificación automática de dificultad de plantillas opere correctamente.
