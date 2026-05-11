import { initAdmin, safeUpdate } from "./migration-utils.mjs";

const TERRENOS_DEFAULT = [
  {
    nombre: "Pavimento / Concreto",
    descripcion: "Calles adoquinadas, asfalto o pasarelas de madera. Cero pérdida de tracción.",
    factor: 1.0,
  },
  {
    nombre: "Tierra Compacta",
    descripcion: "Senderos forestales limpios, secos y estables. Excelente agarre.",
    factor: 1.1,
  },
  {
    nombre: "Bosque con Raíces",
    descripcion: "Suelo húmedo de bosque con obstáculos constantes que exigen atención.",
    factor: 1.2,
  },
  {
    nombre: "Piedra Suelta / Balasto",
    descripcion: "Caminos de herradura, lechos de ríos secos. Inestabilidad constante.",
    factor: 1.3,
  },
  {
    nombre: "Lodo / Arcilla Húmeda",
    descripcion: "Suelo resbaladizo de invierno. Exige esfuerzo extra para mantener el equilibrio.",
    factor: 1.4,
  },
  {
    nombre: "Ceniza Volcánica (Scree)",
    descripcion: "Arena negra suelta o ceniza profunda. Pérdida de hasta un 50% de tracción por paso.",
    factor: 1.5,
  },
  {
    nombre: "Roca / Trepada Técnica",
    descripcion: "Secciones de roca donde se requiere el uso de manos para progresar.",
    factor: 1.5,
  },
];

async function seedTerrenosCollection(db, dryRun) {
  const existingSnapshot = await db.collection("terrenos").limit(1).get();
  if (!existingSnapshot.empty) {
    return 0;
  }
  let created = 0;
  for (const item of TERRENOS_DEFAULT) {
    const ref = db.collection("terrenos").doc();
    await safeUpdate(
      ref,
      {
        nombre: item.nombre,
        descripcion: item.descripcion,
        factor: item.factor,
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

export async function seedTerrenos(dryRun = true) {
  const db = initAdmin();
  const createdTerrenos = await seedTerrenosCollection(db, dryRun);
  return { createdByCollection: { terrenos: createdTerrenos } };
}
