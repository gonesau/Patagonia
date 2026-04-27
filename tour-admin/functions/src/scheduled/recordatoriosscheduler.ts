import { logger } from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "../shared/firebaseAdmin";
import { sendEmail } from "../shared/emailService";

export const recordatoriosscheduler = onSchedule(
  { schedule: "0 8 * * *", timeZone: "America/El_Salvador" },
  async () => {
    const now = new Date();
    const checkAndSend = async (daysAhead: number, field: "recordatorio7dEnviado" | "recordatorio1dEnviado") => {
      const start = new Date(now);
      start.setDate(start.getDate() + daysAhead);
      const end = new Date(start);
      end.setHours(end.getHours() + 1);
      const toursSnapshot = await adminDb
        .collection("tours")
        .where("fechaInicio", ">=", Timestamp.fromDate(start))
        .where("fechaInicio", "<=", Timestamp.fromDate(end))
        .where(field, "==", false)
        .get();

      for (const tourDoc of toursSnapshot.docs) {
        const tour = tourDoc.data();
        const inscripciones = await adminDb
          .collection("tours")
          .doc(tourDoc.id)
          .collection("inscripciones")
          .where("estado", "!=", "cancelado")
          .get();
        for (const inscripcion of inscripciones.docs) {
          const data = inscripcion.data();
          await sendEmail({
            to: data.vagoEmail,
            subject: `Recordatorio de tour - ${tour.nombre}`,
            htmlBody: `<p>Recordatorio de salida para ${tour.nombre}. Punto de encuentro: ${tour.puntoEncuentro}</p>`,
          });
        }
        await tourDoc.ref.update({ [field]: true });
      }
    };

    await checkAndSend(7, "recordatorio7dEnviado");
    await checkAndSend(1, "recordatorio1dEnviado");
    logger.info("Ejecución programada de recordatorios finalizada.");
  },
);
