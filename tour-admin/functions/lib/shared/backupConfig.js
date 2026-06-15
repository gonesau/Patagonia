"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFirestoreAdmin = getFirestoreAdmin;
exports.assertAdmin = assertAdmin;
exports.getProjectId = getProjectId;
exports.getBackupBucketName = getBackupBucketName;
exports.getSourceStorageBucketName = getSourceStorageBucketName;
exports.getDatabaseResourceName = getDatabaseResourceName;
exports.formatBackupId = formatBackupId;
exports.copyStorageObjects = copyStorageObjects;
exports.restoreStorageObjects = restoreStorageObjects;
const storage_1 = require("firebase-admin/storage");
const https_1 = require("firebase-functions/v2/https");
const STORAGE_COPY_CONCURRENCY = 20;
const FIRESTORE_ADMIN_SCOPES = [
    "https://www.googleapis.com/auth/datastore",
    "https://www.googleapis.com/auth/cloud-platform",
];
let firestoreAdminClient;
let firestoreAdminPromise;
async function getFirestoreAdmin() {
    if (firestoreAdminClient) {
        return firestoreAdminClient;
    }
    if (!firestoreAdminPromise) {
        firestoreAdminPromise = (async () => {
            const { google } = await import("googleapis");
            const auth = new google.auth.GoogleAuth({ scopes: FIRESTORE_ADMIN_SCOPES });
            firestoreAdminClient = google.firestore({ version: "v1", auth });
            return firestoreAdminClient;
        })();
    }
    return firestoreAdminPromise;
}
function assertAdmin(request) {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Debes iniciar sesión para ejecutar esta acción.");
    }
    if (request.auth.token.rol !== "admin") {
        throw new https_1.HttpsError("permission-denied", "Solo un administrador puede gestionar copias de seguridad.");
    }
}
function getProjectId() {
    const projectId = process.env.GCLOUD_PROJECT ?? process.env.GCP_PROJECT;
    if (!projectId) {
        throw new https_1.HttpsError("internal", "No fue posible determinar el ID del proyecto.");
    }
    return projectId;
}
function getBackupBucketName() {
    return process.env.BACKUP_BUCKET ?? `${getProjectId()}-backups`;
}
function getSourceStorageBucketName() {
    return process.env.STORAGE_BUCKET ?? (0, storage_1.getStorage)().bucket().name;
}
function getDatabaseResourceName() {
    return `projects/${getProjectId()}/databases/(default)`;
}
function formatBackupId(date) {
    return date.toISOString().replace(/[:.]/g, "-");
}
async function runInBatches(items, worker) {
    for (let i = 0; i < items.length; i += STORAGE_COPY_CONCURRENCY) {
        const batch = items.slice(i, i + STORAGE_COPY_CONCURRENCY);
        await Promise.all(batch.map(worker));
    }
}
async function copyStorageObjects(sourceBucketName, destinationBucketName, destinationPrefix) {
    const storage = (0, storage_1.getStorage)();
    const sourceBucket = storage.bucket(sourceBucketName);
    const destinationBucket = storage.bucket(destinationBucketName);
    const [files] = await sourceBucket.getFiles();
    await runInBatches(files, async (file) => {
        await file.copy(destinationBucket.file(`${destinationPrefix}/${file.name}`));
    });
    return files.length;
}
async function restoreStorageObjects(backupBucketName, backupPrefix, destinationBucketName) {
    const storage = (0, storage_1.getStorage)();
    const backupBucket = storage.bucket(backupBucketName);
    const destinationBucket = storage.bucket(destinationBucketName);
    const normalizedPrefix = backupPrefix.endsWith("/") ? backupPrefix : `${backupPrefix}/`;
    const [files] = await backupBucket.getFiles({ prefix: normalizedPrefix });
    await runInBatches(files, async (file) => {
        const targetName = file.name.slice(normalizedPrefix.length);
        if (!targetName) {
            return;
        }
        await file.copy(destinationBucket.file(targetName));
    });
    return files.length;
}
//# sourceMappingURL=backupConfig.js.map