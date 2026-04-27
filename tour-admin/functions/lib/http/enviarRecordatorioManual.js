"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enviarRecordatorioManual = void 0;
const firebase_functions_1 = require("firebase-functions");
const https_1 = require("firebase-functions/v2/https");
const firebaseAdmin_1 = require("../shared/firebaseAdmin");
const emailService_1 = require("../shared/emailService");
exports.enviarRecordatorioManual = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Debes iniciar sesión para ejecutar esta acción.");
    }
    const { tourId, mensajePersonalizado } = request.data;
    if (!tourId || !mensajePersonalizado) {
        throw new https_1.HttpsError("invalid-argument", "tourId y mensajePersonalizado son obligatorios.");
    }
    const tourSnapshot = await firebaseAdmin_1.adminDb.collection("tours").doc(tourId).get();
    const tour = tourSnapshot.data();
    if (!tour) {
        throw new https_1.HttpsError("not-found", "No se encontró la ocurrencia.");
    }
    const inscripciones = await firebaseAdmin_1.adminDb
        .collection("tours")
        .doc(tourId)
        .collection("inscripciones")
        .where("estado", "!=", "cancelado")
        .get();
    for (const doc of inscripciones.docs) {
        const data = doc.data();
        await (0, emailService_1.sendEmail)({
            to: data.vagoEmail,
            subject: `Recordatorio manual - ${tour.nombre}`,
            htmlBody: `<p>${mensajePersonalizado}</p>`,
        });
    }
    await firebaseAdmin_1.adminDb.collection("notificaciones").add({
        tourId,
        tipo: "manual",
        destinatarios: inscripciones.docs.map((item) => item.data().vagoEmail),
        estado: "enviada",
        enviadaEn: new Date(),
    });
    firebase_functions_1.logger.info("Solicitud enviarRecordatorioManual", {
        userId: request.auth.uid,
        payload: request.data,
    });
    return { ok: true };
});
//# sourceMappingURL=enviarRecordatorioManual.js.map