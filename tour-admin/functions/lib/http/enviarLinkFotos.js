"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enviarLinkFotos = void 0;
const firebase_functions_1 = require("firebase-functions");
const https_1 = require("firebase-functions/v2/https");
const firebaseAdmin_1 = require("../shared/firebaseAdmin");
const emailService_1 = require("../shared/emailService");
const configEmailTemplates_1 = require("../shared/configEmailTemplates");
exports.enviarLinkFotos = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Debes iniciar sesión para ejecutar esta acción.");
    }
    const { tourId, mensajePersonalizado, inscripcionIds } = request.data;
    if (!tourId) {
        throw new https_1.HttpsError("invalid-argument", "tourId es obligatorio.");
    }
    const tourSnapshot = await firebaseAdmin_1.adminDb.collection("tours").doc(tourId).get();
    const tour = tourSnapshot.data();
    if (!tour || !tour.driveFolderUrl) {
        throw new https_1.HttpsError("failed-precondition", "La ocurrencia no tiene carpeta de Drive registrada.");
    }
    let query = firebaseAdmin_1.adminDb
        .collection("tours")
        .doc(tourId)
        .collection("inscripciones")
        .where("estado", "!=", "cancelado");
    if (inscripcionIds && inscripcionIds.length > 0) {
        query = query.where("__name__", "in", inscripcionIds);
    }
    const inscripciones = await query.get();
    const plantillas = await (0, configEmailTemplates_1.getPlantillasEmailConfig)();
    const htmlExtra = plantillas.linkFotosCuerpoHtml ?? "";
    for (const doc of inscripciones.docs) {
        const data = doc.data();
        const htmlBody = [
            `<p>${mensajePersonalizado ?? "Gracias por participar."}</p>`,
            htmlExtra,
            `<p>Fotos: ${tour.driveFolderUrl}</p>`,
        ]
            .filter(Boolean)
            .join("");
        await (0, emailService_1.sendEmail)({
            to: data.vagoEmail,
            subject: `Fotos del tour ${tour.nombre}`,
            htmlBody,
        });
    }
    await firebaseAdmin_1.adminDb.collection("notificaciones").add({
        tourId,
        tipo: "link_fotos",
        destinatarios: inscripciones.docs.map((item) => item.data().vagoEmail),
        estado: "enviada",
        enviadaEn: new Date(),
    });
    firebase_functions_1.logger.info("Solicitud enviarLinkFotos", { userId: request.auth.uid, payload: request.data });
    return { ok: true };
});
//# sourceMappingURL=enviarLinkFotos.js.map