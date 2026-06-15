import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../shared/firebaseAdmin";
import {
  assertAdmin,
  getBackupBucketName,
  getDatabaseResourceName,
  getFirestoreAdmin,
  getSourceStorageBucketName,
  restoreStorageObjects,
} from "../shared/backupConfig";

const CONFIRMATION_KEYWORD = "RESTAURAR";

export const restoreBackup = onCall({ timeoutSeconds: 540, memory: "512MiB" }, async (request) => {
  assertAdmin(request);

  const { backupId, confirm } = request.data as { backupId?: string; confirm?: string };
  if (!backupId) {
    throw new HttpsError("invalid-argument", "backupId es obligatorio.");
  }
  if (confirm !== CONFIRMATION_KEYWORD) {
    throw new HttpsError("failed-precondition", "Debes confirmar la restauración para continuar.");
  }

  const snapshot = await adminDb.collection("backups").doc(backupId).get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "No se encontró la copia de seguridad.");
  }

  const data = snapshot.data()!;
  const firestoreExportPath = typeof data.firestoreExportPath === "string" ? data.firestoreExportPath : null;
  if (!firestoreExportPath) {
    throw new HttpsError("failed-precondition", "La copia de seguridad no tiene una exportación válida.");
  }
  if (data.status !== "completed") {
    throw new HttpsError("failed-precondition", "Solo se puede restaurar una copia completada.");
  }

  try {
    const firestore = await getFirestoreAdmin();
    const importResponse = await firestore.projects.databases.importDocuments({
      name: getDatabaseResourceName(),
      requestBody: { inputUriPrefix: firestoreExportPath },
    });
    const operationName = importResponse.data.name ?? null;

    const storageFilesRestored = await restoreStorageObjects(
      getBackupBucketName(),
      `backups/${backupId}/storage`,
      getSourceStorageBucketName(),
    );

    await adminDb.collection("auditoria").add({
      usuarioId: request.auth!.uid,
      usuarioEmail: request.auth!.token.email ?? "",
      accion: "update",
      entidad: "backup",
      entidadId: backupId,
      detalle: "Restauración desde copia de seguridad",
      timestamp: FieldValue.serverTimestamp(),
    });

    return { operationName, storageFilesRestored };
  } catch (error) {
    throw new HttpsError(
      "internal",
      error instanceof Error ? error.message : "No fue posible restaurar la copia de seguridad.",
    );
  }
});
