import { logger } from "firebase-functions";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { adminDb } from "../shared/firebaseAdmin";
import { sendEmail } from "../shared/emailService";

export const enviarLinkFotos = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión para ejecutar esta acción.");
  }
  const { tourId, mensajePersonalizado } = request.data as {
    tourId?: string;
    mensajePersonalizado?: string;
  };
  if (!tourId) {
    throw new HttpsError("invalid-argument", "tourId es obligatorio.");
  }
  const tourSnapshot = await adminDb.collection("tours").doc(tourId).get();
  const tour = tourSnapshot.data();
  if (!tour || !tour.driveFolderUrl) {
    throw new HttpsError("failed-precondition", "La ocurrencia no tiene carpeta de Drive registrada.");
  }
  const inscripciones = await adminDb
    .collection("tours")
    .doc(tourId)
    .collection("inscripciones")
    .where("estado", "!=", "cancelado")
    .get();

  for (const doc of inscripciones.docs) {
    const data = doc.data();
    await sendEmail({
      to: data.vagoEmail,
      subject: `Fotos del tour ${tour.nombre}`,
      htmlBody: `<p>${mensajePersonalizado ?? "Gracias por participar."}</p><p>Fotos: ${tour.driveFolderUrl}</p>`,
    });
  }
  await adminDb.collection("notificaciones").add({
    tourId,
    tipo: "link_fotos",
    destinatarios: inscripciones.docs.map((item) => item.data().vagoEmail),
    estado: "enviada",
    enviadaEn: new Date(),
  });

  logger.info("Solicitud enviarLinkFotos", { userId: request.auth.uid, payload: request.data });
  return { ok: true };
});
