"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onInscripcionCreada = void 0;
const firebase_functions_1 = require("firebase-functions");
const firestore_1 = require("firebase-functions/v2/firestore");
const firebaseAdmin_1 = require("../shared/firebaseAdmin");
const emailService_1 = require("../shared/emailService");
const configEmailTemplates_1 = require("../shared/configEmailTemplates");
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
    const plantillaId = typeof tour.plantillaId === "string" ? tour.plantillaId : "";
    const plantillaSnap = plantillaId ? await firebaseAdmin_1.adminDb.collection("tour_plantillas").doc(plantillaId).get() : null;
    const plantilla = plantillaSnap?.exists ? plantillaSnap.data() : undefined;
    const guiaId = typeof tour.guiaId === "string" ? tour.guiaId : "";
    const guiaSnap = guiaId ? await firebaseAdmin_1.adminDb.collection("guias").doc(guiaId).get() : null;
    const guia = guiaSnap?.exists ? guiaSnap.data() : undefined;
    const guiaNombre = guia && typeof guia.nombre === "string" && typeof guia.apellido === "string"
        ? `${guia.nombre} ${guia.apellido}`.trim()
        : "Por confirmar";
    const queLlevar = (typeof tour.queLlevar === "string" && tour.queLlevar) ||
        (plantilla && typeof plantilla.queLlevar === "string" && plantilla.queLlevar) ||
        "";
    const descripcionTour = (typeof tour.descripcion === "string" && tour.descripcion) ||
        (plantilla && typeof plantilla.descripcion === "string" && plantilla.descripcion) ||
        "";
    const montoTotal = typeof data.montoTotal === "number" ? data.montoTotal : Number(data.montoTotal ?? 0);
    const plantillas = await (0, configEmailTemplates_1.getPlantillasEmailConfig)();
    const htmlParts = [
        `<p>Hola ${data.vagoNombre}, tu inscripción está registrada para <strong>${tour.nombre}</strong>.</p>`,
        `<p><strong>Fecha y hora:</strong> ${tour.fechaInicio.toDate().toLocaleString("es-SV")}</p>`,
        `<p><strong>Punto de encuentro:</strong> ${tour.puntoEncuentro ?? "Por confirmar"}</p>`,
        `<p><strong>Guía:</strong> ${guiaNombre}</p>`,
        queLlevar ? `<p><strong>Qué llevar:</strong> ${queLlevar}</p>` : "",
        `<p><strong>Monto total acordado:</strong> $${montoTotal.toFixed(2)} USD</p>`,
        `<p><strong>Instrucciones de pago:</strong> coordina el pago pendiente con administración; indica tu nombre y el tour en la transferencia.</p>`,
        plantillas.confirmacionCuerpoHtml ?? "",
    ].filter(Boolean);
    const calendarDescription = [descripcionTour, queLlevar ? `Qué llevar: ${queLlevar}` : ""]
        .filter(Boolean)
        .join("\n\n");
    await (0, emailService_1.sendEmail)({
        to: data.vagoEmail,
        subject: `Confirmación de inscripción - ${tour.nombre}`,
        htmlBody: htmlParts.join(""),
        calendar: {
            title: tour.nombre,
            description: calendarDescription || "Tour Patagonia",
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