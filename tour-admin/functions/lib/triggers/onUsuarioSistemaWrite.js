"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onUsuarioSistemaWrite = void 0;
const firebase_functions_1 = require("firebase-functions");
const firestore_1 = require("firebase-functions/v2/firestore");
const auth_1 = require("firebase-admin/auth");
require("../shared/firebaseAdmin");
const ROLES_PERMITIDOS = new Set(["admin", "guia"]);
function esRolValido(valor) {
    return typeof valor === "string" && ROLES_PERMITIDOS.has(valor);
}
exports.onUsuarioSistemaWrite = (0, firestore_1.onDocumentWritten)("usuarios_sistema/{userId}", async (event) => {
    const userId = event.params.userId;
    const after = event.data?.after.data();
    if (!after) {
        await limpiarClaims(userId);
        return;
    }
    const rol = after.rol;
    const activo = Boolean(after.activo);
    if (!activo || !esRolValido(rol)) {
        await limpiarClaims(userId);
        return;
    }
    const guiaId = typeof after.guiaId === "string" && after.guiaId.length > 0 ? after.guiaId : null;
    await (0, auth_1.getAuth)().setCustomUserClaims(userId, { rol, guiaId });
    firebase_functions_1.logger.info("Custom claims sincronizados", { userId, rol, guiaId });
});
async function limpiarClaims(userId) {
    try {
        await (0, auth_1.getAuth)().setCustomUserClaims(userId, null);
        firebase_functions_1.logger.info("Custom claims removidos", { userId });
    }
    catch (error) {
        firebase_functions_1.logger.warn("No fue posible limpiar custom claims", { userId, error });
    }
}
//# sourceMappingURL=onUsuarioSistemaWrite.js.map