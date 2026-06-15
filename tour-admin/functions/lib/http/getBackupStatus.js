"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBackupStatus = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const firebaseAdmin_1 = require("../shared/firebaseAdmin");
const backupConfig_1 = require("../shared/backupConfig");
exports.getBackupStatus = (0, https_1.onCall)(async (request) => {
    (0, backupConfig_1.assertAdmin)(request);
    const { backupId } = request.data;
    if (!backupId) {
        throw new https_1.HttpsError("invalid-argument", "backupId es obligatorio.");
    }
    const docRef = firebaseAdmin_1.adminDb.collection("backups").doc(backupId);
    const snapshot = await docRef.get();
    if (!snapshot.exists) {
        throw new https_1.HttpsError("not-found", "No se encontró la copia de seguridad.");
    }
    const data = snapshot.data();
    const currentStatus = typeof data.status === "string" ? data.status : "unknown";
    const operationName = typeof data.firestoreOperationName === "string" ? data.firestoreOperationName : null;
    if (currentStatus !== "pending" || !operationName) {
        return { status: currentStatus };
    }
    const firestore = await (0, backupConfig_1.getFirestoreAdmin)();
    const operationResponse = await firestore.projects.databases.operations.get({ name: operationName });
    const operation = operationResponse.data;
    if (!operation.done) {
        return { status: "pending" };
    }
    const failed = Boolean(operation.error);
    const nextStatus = failed ? "failed" : "completed";
    await docRef.update({
        status: nextStatus,
        completedAt: firestore_1.FieldValue.serverTimestamp(),
        ...(failed ? { errorMessage: operation.error?.message ?? "La exportación falló." } : {}),
    });
    return { status: nextStatus };
});
//# sourceMappingURL=getBackupStatus.js.map