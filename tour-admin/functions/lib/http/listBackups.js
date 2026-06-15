"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listBackups = void 0;
const https_1 = require("firebase-functions/v2/https");
const firebaseAdmin_1 = require("../shared/firebaseAdmin");
const backupConfig_1 = require("../shared/backupConfig");
function timestampToIso(value) {
    if (value && typeof value === "object" && "toDate" in value) {
        const toDate = value.toDate;
        if (typeof toDate === "function") {
            return toDate.call(value).toISOString();
        }
    }
    return null;
}
exports.listBackups = (0, https_1.onCall)(async (request) => {
    (0, backupConfig_1.assertAdmin)(request);
    const snapshot = await firebaseAdmin_1.adminDb.collection("backups").orderBy("createdAt", "desc").limit(50).get();
    const backups = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            status: typeof data.status === "string" ? data.status : "unknown",
            createdByEmail: typeof data.createdByEmail === "string" ? data.createdByEmail : null,
            createdAt: timestampToIso(data.createdAt),
            storageFilesCopied: typeof data.storageFilesCopied === "number" ? data.storageFilesCopied : null,
            errorMessage: typeof data.errorMessage === "string" ? data.errorMessage : null,
        };
    });
    return { backups };
});
//# sourceMappingURL=listBackups.js.map