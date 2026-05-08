import { initAdmin, safeUpdate } from "./migration-utils.mjs";

async function seedCollection(db, collectionName, defaults, dryRun) {
  const existingSnapshot = await db.collection(collectionName).limit(1).get();
  if (!existingSnapshot.empty) {
    return 0;
  }
  let created = 0;
  for (const item of defaults) {
    const ref = db.collection(collectionName).doc();
    await safeUpdate(
      ref,
      {
        nombre: item.nombre,
        descripcion: item.descripcion ?? "",
        activo: true,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      },
      dryRun,
    );
    created += 1;
  }
  return created;
}

export async function seedDefaultCatalogs(dryRun = true) {
  const db = initAdmin();
  const createdByCollection = {
    relacionesEmergencia: await seedCollection(
      db,
      "relacionesEmergencia",
      [{ nombre: "Padre" }, { nombre: "Madre" }, { nombre: "Hermano" }, { nombre: "Pareja" }, { nombre: "Otro" }],
      dryRun,
    ),
    nivelesExperiencia: await seedCollection(
      db,
      "nivelesExperiencia",
      [{ nombre: "principiante" }, { nombre: "intermedio" }, { nombre: "avanzado" }, { nombre: "experto" }],
      dryRun,
    ),
    tiposVehiculo: await seedCollection(
      db,
      "tiposVehiculo",
      [{ nombre: "Microbus" }, { nombre: "Coaster" }, { nombre: "Pickup" }, { nombre: "Camioneta" }],
      dryRun,
    ),
    estadosGuia: await seedCollection(
      db,
      "estadosGuia",
      [{ nombre: "activo" }, { nombre: "inactivo" }, { nombre: "suspendido" }],
      dryRun,
    ),
    dificultadesPlantilla: await seedCollection(
      db,
      "dificultadesPlantilla",
      [{ nombre: "muy_facil" }, { nombre: "facil" }, { nombre: "moderado" }, { nombre: "dificil" }, { nombre: "muy_dificil" }],
      dryRun,
    ),
    estadosTour: await seedCollection(
      db,
      "estadosTour",
      [{ nombre: "borrador" }, { nombre: "publicado" }, { nombre: "lleno" }, { nombre: "en_curso" }, { nombre: "realizado" }, { nombre: "cancelado" }],
      dryRun,
    ),
    metodosPago: await seedCollection(
      db,
      "metodosPago",
      [{ nombre: "efectivo" }, { nombre: "transferencia" }, { nombre: "tarjeta" }, { nombre: "deposito" }, { nombre: "otro" }],
      dryRun,
    ),
  };
  return { createdByCollection };
}
