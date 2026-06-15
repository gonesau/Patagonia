import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../shared/firebaseAdmin";
import {
  assertAdmin,
  copyStorageObjects,
  formatBackupId,
  getBackupBucketName,
  getDatabaseResourceName,
  getFirestoreAdmin,
  getSourceStorageBucketName,
} from "../shared/backupConfig";

function toSafeMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Error desconocido al crear la copia.";
}

export const createBackup = onCall({ timeoutSeconds: 540, memory: "512MiB" }, async (request) => {
  assertAdmin(request);

  const backupId = formatBackupId(new Date());
  const backupBucket = getBackupBucketName();
  const firestoreExportPath = `gs://${backupBucket}/backups/${backupId}/firestore`;
  const storagePrefix = `backups/${backupId}/storage`;
  const docRef = adminDb.collection("backups").doc(backupId);

  await docRef.set({
    id: backupId,
    status: "pending",
    createdBy: request.auth!.uid,
    createdByEmail: request.auth!.token.email ?? null,
    createdAt: FieldValue.serverTimestamp(),
    firestoreExportPath,
    storageBackupPath: `gs://${backupBucket}/${storagePrefix}`,
  });

  try {
    const firestore = await getFirestoreAdmin();
    const exportResponse = await firestore.projects.databases.exportDocuments({
      name: getDatabaseResourceName(),
      requestBody: { outputUriPrefix: firestoreExportPath },
    });
    const operationName = exportResponse.data.name ?? null;

    const storageFilesCopied = await copyStorageObjects(
      getSourceStorageBucketName(),
      backupBucket,
      storagePrefix,
    );

    await docRef.update({
      firestoreOperationName: operationName,
      storageFilesCopied,
    });

    await adminDb.collection("auditoria").add({
      usuarioId: request.auth!.uid,
      usuarioEmail: request.auth!.token.email ?? "",
      accion: "create",
      entidad: "backup",
      entidadId: backupId,
      detalle: "Copia de seguridad creada",
      timestamp: FieldValue.serverTimestamp(),
    });

    return { backupId, operationName };
  } catch (error) {
    await docRef.update({ status: "failed", errorMessage: toSafeMessage(error) });
    throw new HttpsError("internal", "No fue posible crear la copia de seguridad.");
  }
});
