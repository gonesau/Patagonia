"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordatoriosscheduler = void 0;
const firebase_functions_1 = require("firebase-functions");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firestore_1 = require("firebase-admin/firestore");
const firebaseAdmin_1 = require("../shared/firebaseAdmin");
const emailService_1 = require("../shared/emailService");
const configEmailTemplates_1 = require("../shared/configEmailTemplates");
exports.recordatoriosscheduler = (0, scheduler_1.onSchedule)({ schedule: "0 8 * * *", timeZone: "America/El_Salvador" }, async () => {
    const now = new Date();
    const plantillasConfig = await (0, configEmailTemplates_1.getPlantillasEmailConfig)();
    const checkAndSend = async (daysAhead, field) => {
        const start = new Date(now);
        start.setDate(start.getDate() + daysAhead);
        const end = new Date(start);
        end.setHours(end.getHours() + 1);
        const toursSnapshot = await firebaseAdmin_1.adminDb
            .collection("tours")
            .where("fechaInicio", ">=", firestore_1.Timestamp.fromDate(start))
            .where("fechaInicio", "<=", firestore_1.Timestamp.fromDate(end))
            .where(field, "==", false)
            .get();
        for (const tourDoc of toursSnapshot.docs) {
            const tour = tourDoc.data();
            if (tour.estado !== "publicado") {
                continue;
            }
            if (tour.recordatoriosAutomaticosHabilitados === false) {
                continue;
            }
            const inscripciones = await firebaseAdmin_1.adminDb
                .collection("tours")
                .doc(tourDoc.id)
                .collection("inscripciones")
                .where("estado", "in", ["inscrito", "confirmado"])
                .get();
            const plantillaExtra = field === "recordatorio7dEnviado"
                ? plantillasConfig.recordatorio7dCuerpoHtml
                : plantillasConfig.recordatorio1dCuerpoHtml;
            for (const inscripcion of inscripciones.docs) {
                const data = inscripcion.data();
                const baseHtml = `<p>Recordatorio de salida para ${tour.nombre}. Punto de encuentro: ${tour.puntoEncuentro ?? "Por confirmar"}</p>`;
                const htmlBody = [baseHtml, plantillaExtra ?? ""].filter(Boolean).join("");
                await (0, emailService_1.sendEmail)({
                    to: data.vagoEmail,
                    subject: `Recordatorio de tour - ${tour.nombre}`,
                    htmlBody,
                });
            }
            await tourDoc.ref.update({ [field]: true });
        }
    };
    await checkAndSend(7, "recordatorio7dEnviado");
    await checkAndSend(1, "recordatorio1dEnviado");
    firebase_functions_1.logger.info("Ejecución programada de recordatorios finalizada.");
});
//# sourceMappingURL=recordatoriosscheduler.js.map