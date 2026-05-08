import { initAdmin, safeUpdate } from "./migration-utils.mjs";

async function ensureCatalogMap(db, collectionName) {
  const snapshot = await db.collection(collectionName).get();
  const byName = new Map();
  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    const name = String(data.nombre ?? "").toLowerCase();
    if (name) {
      byName.set(name, { id: doc.id, nombre: data.nombre });
    }
  });
  return byName;
}

export async function backfillCatalogReferences(dryRun = true) {
  const db = initAdmin();
  const [
    relacionesMap,
    nivelesMap,
    tiposVehiculoMap,
    estadosGuiaMap,
    dificultadesMap,
    estadosTourMap,
    metodosPagoMap,
  ] = await Promise.all([
    ensureCatalogMap(db, "relacionesEmergencia"),
    ensureCatalogMap(db, "nivelesExperiencia"),
    ensureCatalogMap(db, "nivelesExperiencia"),
    ensureCatalogMap(db, "estadosGuia"),
    ensureCatalogMap(db, "dificultadesPlantilla"),
    ensureCatalogMap(db, "estadosTour"),
    ensureCatalogMap(db, "metodosPago"),
  ]);

  let patched = 0;

  const vagos = await db.collection("vagos").get();
  for (const doc of vagos.docs) {
    const data = doc.data();
    const relation = relacionesMap.get(String(data.contactoEmergenciaRelacion ?? "").toLowerCase());
    const level = nivelesMap.get(String(data.nivelExperiencia ?? "").toLowerCase());
    if (!relation && !level) {
      continue;
    }
    await safeUpdate(
      doc.ref,
      {
        contactoEmergenciaRelacionId: relation?.id ?? data.contactoEmergenciaRelacionId ?? null,
        nivelExperienciaId: level?.id ?? data.nivelExperienciaId ?? null,
      },
      dryRun,
    );
    patched += 1;
  }

  const transporte = await db.collection("transporte").get();
  for (const doc of transporte.docs) {
    const data = doc.data();
    const tipo = tiposVehiculoMap.get(String(data.tipoVehiculoNombreSnapshot ?? data.modelo ?? "").toLowerCase());
    if (!tipo) {
      continue;
    }
    await safeUpdate(doc.ref, { tipoVehiculoId: tipo.id, tipoVehiculoNombreSnapshot: tipo.nombre }, dryRun);
    patched += 1;
  }

  const guias = await db.collection("guias").get();
  for (const doc of guias.docs) {
    const data = doc.data();
    const estado = estadosGuiaMap.get(String(data.estado ?? "").toLowerCase());
    if (!estado) {
      continue;
    }
    await safeUpdate(doc.ref, { estadoId: estado.id, estado: estado.nombre }, dryRun);
    patched += 1;
  }

  const plantillas = await db.collection("tour_plantillas").get();
  for (const doc of plantillas.docs) {
    const data = doc.data();
    const dificultad = dificultadesMap.get(String(data.dificultad ?? "").toLowerCase());
    if (!dificultad) {
      continue;
    }
    await safeUpdate(doc.ref, { dificultadId: dificultad.id, dificultad: dificultad.nombre }, dryRun);
    patched += 1;
  }

  const tours = await db.collection("tours").get();
  for (const doc of tours.docs) {
    const data = doc.data();
    const estado = estadosTourMap.get(String(data.estado ?? "").toLowerCase());
    if (!estado) {
      continue;
    }
    await safeUpdate(doc.ref, { estadoId: estado.id, estado: estado.nombre }, dryRun);
    patched += 1;
  }

  const pagos = await db.collection("pagos").get();
  for (const doc of pagos.docs) {
    const data = doc.data();
    const metodo = metodosPagoMap.get(String(data.metodoPago ?? "").toLowerCase());
    if (!metodo) {
      continue;
    }
    await safeUpdate(doc.ref, { metodoPagoId: metodo.id, metodoPago: metodo.nombre }, dryRun);
    patched += 1;
  }

  return { patched };
}
