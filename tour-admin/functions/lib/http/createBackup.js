"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBackup = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const firebaseAdmin_1 = require("../shared/firebaseAdmin");
const backupConfig_1 = require("../shared/backupConfig");
function toSafeMessage(error) {
    return error instanceof Error ? error.message : "Error desconocido al crear la copia.";
}
exports.createBackup = (0, https_1.onCall)({ timeoutSeconds: 540, memory: "512MiB" }, async (request) => {
    (0, backupConfig_1.assertAdmin)(request);
    const backupId = (0, backupConfig_1.formatBackupId)(new Date());
    const backupBucket = (0, backupConfig_1.getBackupBucketName)();
    const firestoreExportPath = `gs://${backupBucket}/backups/${backupId}/firestore`;
    const storagePrefix = `backups/${backupId}/storage`;
    const docRef = firebaseAdmin_1.adminDb.collection("backups").doc(backupId);
    await docRef.set({
        id: backupId,
        status: "pending",
        createdBy: request.auth.uid,
        createdByEmail: request.auth.token.email ?? null,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        firestoreExportPath,
        storageBackupPath: `gs://${backupBucket}/${storagePrefix}`,
    });
    try {
        const firestore = await (0, backupConfig_1.getFirestoreAdmin)();
        const exportResponse = await firestore.projects.databases.exportDocuments({
            name: (0, backupConfig_1.getDatabaseResourceName)(),
            requestBody: { outputUriPrefix: firestoreExportPath },
        });
        const operationName = exportResponse.data.name ?? null;
        const storageFilesCopied = await (0, backupConfig_1.copyStorageObjects)((0, backupConfig_1.getSourceStorageBucketName)(), backupBucket, storagePrefix);
        await docRef.update({
            firestoreOperationName: operationName,
            storageFilesCopied,
        });
        await firebaseAdmin_1.adminDb.collection("auditoria").add({
            usuarioId: request.auth.uid,
            usuarioEmail: request.auth.token.email ?? "",
            accion: "create",
            entidad: "backup",
            entidadId: backupId,
            detalle: "Copia de seguridad creada",
            timestamp: firestore_1.FieldValue.serverTimestamp(),
        });
        return { backupId, operationName };
    }
    catch (error) {
        await docRef.update({ status: "failed", errorMessage: toSafeMessage(error) });
        throw new https_1.HttpsError("internal", "No fue posible crear la copia de seguridad.");
    }
});
//# sourceMappingURL=createBackup.js.map