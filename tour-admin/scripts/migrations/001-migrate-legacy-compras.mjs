import { initAdmin, safeUpdate } from "./migration-utils.mjs";

export async function migrateLegacyCompras(dryRun = true) {
  const db = initAdmin();
  const toursSnapshot = await db.collection("tours").get();
  let migrated = 0;

  for (const tourDoc of toursSnapshot.docs) {
    const comprasSnapshot = await db.collection("tours").doc(tourDoc.id).collection("compras").get();
    for (const compraDoc of comprasSnapshot.docs) {
      const sourceData = compraDoc.data();
      const legacyCompraRef = `tours/${tourDoc.id}/compras/${compraDoc.id}`;
      const existing = await db.collection("compras").where("legacyCompraRef", "==", legacyCompraRef).limit(1).get();
      if (!existing.empty) {
        continue;
      }
      const targetRef = db.collection("compras").doc();
      const payload = {
        nombre: sourceData.nombre ?? "Compra migrada",
        descripcion: sourceData.descripcion ?? "",
        categoriaId: sourceData.categoriaId ?? "",
        categoriaNombreSnapshot: sourceData.categoriaNombreSnapshot ?? sourceData.categoria ?? "Sin categoría",
        monto: Number(sourceData.monto ?? 0),
        fecha: sourceData.fecha ?? sourceData.creadoEn ?? new Date(),
        tourId: tourDoc.id,
        legacyCompraRef,
        creadoEn: sourceData.creadoEn ?? new Date(),
        actualizadoEn: new Date(),
      };
      await safeUpdate(targetRef, payload, dryRun);
      migrated += 1;
    }
  }

  return { migrated };
}
