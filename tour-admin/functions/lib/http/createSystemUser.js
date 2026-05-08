"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSystemUser = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
const firebaseAdmin_1 = require("../shared/firebaseAdmin");
const emailService_1 = require("../shared/emailService");
const ALLOWED_ROLES = new Set(["admin", "guia", "operador"]);
function isValidRole(value) {
    return typeof value === "string" && ALLOWED_ROLES.has(value);
}
exports.createSystemUser = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Debes iniciar sesión para ejecutar esta acción.");
    }
    if (request.auth.token.rol !== "admin") {
        throw new https_1.HttpsError("permission-denied", "No tienes permisos para crear usuarios.");
    }
    const { email, nombre, rol, guiaId, sendInvitation } = request.data;
    if (!email || !nombre || !isValidRole(rol)) {
        throw new https_1.HttpsError("invalid-argument", "email, nombre y rol son obligatorios.");
    }
    let userRecord;
    try {
        userRecord = await (0, auth_1.getAuth)().getUserByEmail(email);
    }
    catch {
        const temporaryPassword = Math.random().toString(36).slice(-12) + "Aa1!";
        userRecord = await (0, auth_1.getAuth)().createUser({
            email,
            displayName: nombre,
            password: temporaryPassword,
            emailVerified: false,
        });
    }
    await firebaseAdmin_1.adminDb.collection("usuarios_sistema").doc(userRecord.uid).set({
        email,
        nombre,
        rol,
        guiaId: guiaId ?? null,
        activo: true,
        invitacionPendiente: Boolean(sendInvitation),
        creadoEn: firestore_1.FieldValue.serverTimestamp(),
        actualizadoEn: firestore_1.FieldValue.serverTimestamp(),
    }, { merge: true });
    let invitationSent = false;
    if (sendInvitation) {
        const inviteLink = await (0, auth_1.getAuth)().generateSignInWithEmailLink(email, {
            url: process.env.APP_INVITE_URL ?? "https://patagonia.app/login",
            handleCodeInApp: true,
        });
        await (0, emailService_1.sendEmail)({
            to: email,
            subject: "Invitación de acceso a Patagonia",
            htmlBody: `<p>Hola ${nombre},</p><p>Se te ha creado acceso al sistema Patagonia con rol <strong>${rol}</strong>.</p><p>Usa este enlace para ingresar: <a href="${inviteLink}">${inviteLink}</a></p>`,
        });
        invitationSent = true;
    }
    return { uid: userRecord.uid, invitationSent };
});
//# sourceMappingURL=createSystemUser.js.map