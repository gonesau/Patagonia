import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../shared/firebaseAdmin";
import { assertAdmin, getFirestoreAdmin } from "../shared/backupConfig";

export const getBackupStatus = onCall(async (request) => {
  assertAdmin(request);

  const { backupId } = request.data as { backupId?: string };
  if (!backupId) {
    throw new HttpsError("invalid-argument", "backupId es obligatorio.");
  }

  const docRef = adminDb.collection("backups").doc(backupId);
  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    throw new HttpsError("not-found", "No se encontró la copia de seguridad.");
  }

  const data = snapshot.data()!;
  const currentStatus = typeof data.status === "string" ? data.status : "unknown";
  const operationName = typeof data.firestoreOperationName === "string" ? data.firestoreOperationName : null;

  if (currentStatus !== "pending" || !operationName) {
    return { status: currentStatus };
  }

  const firestore = await getFirestoreAdmin();
  const operationResponse = await firestore.projects.databases.operations.get({ name: operationName });
  const operation = operationResponse.data;

  if (!operation.done) {
    return { status: "pending" };
  }

  const failed = Boolean(operation.error);
  const nextStatus = failed ? "failed" : "completed";
  await docRef.update({
    status: nextStatus,
    completedAt: FieldValue.serverTimestamp(),
    ...(failed ? { errorMessage: operation.error?.message ?? "La exportación falló." } : {}),
  });

  return { status: nextStatus };
});
