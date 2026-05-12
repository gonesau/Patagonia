import { logger } from "firebase-functions";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { adminDb } from "../shared/firebaseAdmin";
import { sendEmail } from "../shared/emailService";

export const enviarRecordatorioManual = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión para ejecutar esta acción.");
  }
  const { tourId, mensajePersonalizado, inscripcionIds } = request.data as {
    tourId?: string;
    mensajePersonalizado?: string;
    inscripcionIds?: string[];
  };
  if (!tourId || !mensajePersonalizado) {
    throw new HttpsError("invalid-argument", "tourId y mensajePersonalizado son obligatorios.");
  }
  const tourSnapshot = await adminDb.collection("tours").doc(tourId).get();
  const tour = tourSnapshot.data();
  if (!tour) {
    throw new HttpsError("not-found", "No se encontró la ocurrencia.");
  }
  let query = adminDb
    .collection("tours")
    .doc(tourId)
    .collection("inscripciones")
    .where("estado", "!=", "cancelado");

  if (inscripcionIds && inscripcionIds.length > 0) {
    query = query.where("__name__", "in", inscripcionIds);
  }

  const inscripciones = await query.get();
  for (const doc of inscripciones.docs) {
    const data = doc.data();
    await sendEmail({
      to: data.vagoEmail,
      subject: `Recordatorio manual - ${tour.nombre}`,
      htmlBody: `<p>${mensajePersonalizado}</p>`,
    });
  }
  await adminDb.collection("notificaciones").add({
    tourId,
    tipo: "manual",
    destinatarios: inscripciones.docs.map((item) => item.data().vagoEmail),
    estado: "enviada",
    enviadaEn: new Date(),
  });

  logger.info("Solicitud enviarRecordatorioManual", {
    userId: request.auth.uid,
    payload: request.data,
  });
  return { ok: true };
});
