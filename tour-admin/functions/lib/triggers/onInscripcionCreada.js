"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onInscripcionCreada = void 0;
const firebase_functions_1 = require("firebase-functions");
const firestore_1 = require("firebase-functions/v2/firestore");
const firebaseAdmin_1 = require("../shared/firebaseAdmin");
const emailService_1 = require("../shared/emailService");
exports.onInscripcionCreada = (0, firestore_1.onDocumentCreated)("tours/{tourId}/inscripciones/{inscripcionId}", async (event) => {
    const data = event.data?.data();
    if (!data) {
        return;
    }
    const tourSnapshot = await firebaseAdmin_1.adminDb.collection("tours").doc(event.params.tourId).get();
    const tour = tourSnapshot.data();
    if (!tour) {
        return;
    }
    await (0, emailService_1.sendEmail)({
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
    await firebaseAdmin_1.adminDb.collection("notificaciones").add({
        tourId: event.params.tourId,
        tipo: "confirmacion",
        destinatarios: [data.vagoEmail],
        estado: "enviada",
        enviadaEn: new Date(),
    });
    firebase_functions_1.logger.info("Trigger onInscripcionCreada ejecutado", {
        tourId: event.params.tourId,
        inscripcionId: event.params.inscripcionId,
    });
});
//# sourceMappingURL=onInscripcionCreada.js.map