"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.restoreBackup = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const firebaseAdmin_1 = require("../shared/firebaseAdmin");
const backupConfig_1 = require("../shared/backupConfig");
const CONFIRMATION_KEYWORD = "RESTAURAR";
function toRestoreError(error) {
    const message = error instanceof Error ? error.message : "";
    if (/permission|denied|forbidden|403/i.test(message)) {
        return new https_1.HttpsError("failed-precondition", "La cuenta de servicio de Cloud Functions no tiene permisos para importar datos o leer el bucket de respaldos. Contacta al administrador de GCP.");
    }
    return new https_1.HttpsError("internal", "No fue posible restaurar la copia de seguridad.");
}
exports.restoreBackup = (0, https_1.onCall)({ timeoutSeconds: 540, memory: "512MiB" }, async (request) => {
    (0, backupConfig_1.assertAdmin)(request);
    const { backupId, confirm } = request.data;
    if (!backupId) {
        throw new https_1.HttpsError("invalid-argument", "backupId es obligatorio.");
    }
    if (confirm !== CONFIRMATION_KEYWORD) {
        throw new https_1.HttpsError("failed-precondition", "Debes confirmar la restauración para continuar.");
    }
    const snapshot = await firebaseAdmin_1.adminDb.collection("backups").doc(backupId).get();
    if (!snapshot.exists) {
        throw new https_1.HttpsError("not-found", "No se encontró la copia de seguridad.");
    }
    const data = snapshot.data();
    const firestoreExportPath = typeof data.firestoreExportPath === "string" ? data.firestoreExportPath : null;
    if (!firestoreExportPath) {
        throw new https_1.HttpsError("failed-precondition", "La copia de seguridad no tiene una exportación válida.");
    }
    if (data.status !== "completed") {
        throw new https_1.HttpsError("failed-precondition", "Solo se puede restaurar una copia completada.");
    }
    try {
        const firestore = await (0, backupConfig_1.getFirestoreAdmin)();
        const importResponse = await firestore.projects.databases.importDocuments({
            name: (0, backupConfig_1.getDatabaseResourceName)(),
            requestBody: { inputUriPrefix: firestoreExportPath },
        });
        const operationName = importResponse.data.name ?? null;
        const storageFilesRestored = await (0, backupConfig_1.restoreStorageObjects)((0, backupConfig_1.getBackupBucketName)(), `backups/${backupId}/storage`, (0, backupConfig_1.getSourceStorageBucketName)());
        await firebaseAdmin_1.adminDb.collection("auditoria").add({
            usuarioId: request.auth.uid,
            usuarioEmail: request.auth.token.email ?? "",
            accion: "update",
            entidad: "backup",
            entidadId: backupId,
            detalle: "Restauración desde copia de seguridad",
            timestamp: firestore_1.FieldValue.serverTimestamp(),
        });
        return { operationName, storageFilesRestored };
    }
    catch (error) {
        throw toRestoreError(error);
    }
});
//# sourceMappingURL=restoreBackup.js.map