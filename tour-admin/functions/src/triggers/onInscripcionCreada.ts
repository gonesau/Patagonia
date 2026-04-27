import { logger } from "firebase-functions";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { adminDb } from "../shared/firebaseAdmin";
import { sendEmail } from "../shared/emailService";

export const onInscripcionCreada = onDocumentCreated(
  "tours/{tourId}/inscripciones/{inscripcionId}",
  async (event) => {
    const data = event.data?.data();
    if (!data) {
      return;
    }
    const tourSnapshot = await adminDb.collection("tours").doc(event.params.tourId).get();
    const tour = tourSnapshot.data();
    if (!tour) {
      return;
    }

    await sendEmail({
      to: data.vagoEmail,
      subject: `Confirmación de inscripción - ${tour.nombre}`,
      htmlBody: `<p>Hola ${data.vagoNombre}, tu inscripción está confirmada para ${tour.nombre}.</p>`,
      calendar: {
        title: tour.nombre,
        description: "Tour Patagonia",
        location: tour.puntoEncuentro ?? "Por confirmar",
        start: tour.fechaInicio.toDate(),
        end: tour.fechaFin.toDate(),
      },
    });
    await adminDb.collection("notificaciones").add({
      tourId: event.params.tourId,
      tipo: "confirmacion",
      destinatarios: [data.vagoEmail],
      estado: "enviada",
      enviadaEn: new Date(),
    });

    logger.info("Trigger onInscripcionCreada ejecutado", {
      tourId: event.params.tourId,
      inscripcionId: event.params.inscripcionId,
    });
  },
);
