import { isDryRun } from "./migration-utils.mjs";
import { seedDefaultCatalogs } from "./003-seed-default-catalogs.mjs";
import { migrateLegacyCompras } from "./001-migrate-legacy-compras.mjs";
import { backfillCatalogReferences } from "./002-backfill-catalog-references.mjs";
import { seedTerrenos } from "./004-seed-terrenos.mjs";

async function run() {
  const dryRun = isDryRun(process.argv.slice(2));
  console.log(`[migrations] starting (dryRun=${dryRun})`);
  const seedResult = await seedDefaultCatalogs(dryRun);
  console.log("[migrations] seed complete", seedResult);
  const comprasResult = await migrateLegacyCompras(dryRun);
  console.log("[migrations] legacy compras complete", comprasResult);
  const backfillResult = await backfillCatalogReferences(dryRun);
  console.log("[migrations] backfill complete", backfillResult);
  const terrenosResult = await seedTerrenos(dryRun);
  console.log("[migrations] terrenos seed complete", terrenosResult);
  console.log("[migrations] done");
}

run().catch((error) => {
  console.error("[migrations] failed", error);
  process.exit(1);
});
