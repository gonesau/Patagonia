import { onCall } from "firebase-functions/v2/https";
import { adminDb } from "../shared/firebaseAdmin";
import { assertAdmin } from "../shared/backupConfig";

interface BackupListItem {
  id: string;
  status: string;
  createdByEmail: string | null;
  createdAt: string | null;
  storageFilesCopied: number | null;
  errorMessage: string | null;
}

function timestampToIso(value: unknown): string | null {
  if (value && typeof value === "object" && "toDate" in value) {
    const toDate = (value as { toDate?: () => Date }).toDate;
    if (typeof toDate === "function") {
      return toDate.call(value).toISOString();
    }
  }
  return null;
}

export const listBackups = onCall(async (request) => {
  assertAdmin(request);

  const snapshot = await adminDb.collection("backups").orderBy("createdAt", "desc").limit(50).get();
  const backups: BackupListItem[] = snapshot.docs.map((doc) => {
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
