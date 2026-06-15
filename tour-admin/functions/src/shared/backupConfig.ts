import { getStorage } from "firebase-admin/storage";
import { CallableRequest, HttpsError } from "firebase-functions/v2/https";
import type { firestore_v1 } from "googleapis";

type FirestoreAdmin = firestore_v1.Firestore;

const STORAGE_COPY_CONCURRENCY = 20;
const FIRESTORE_ADMIN_SCOPES = [
  "https://www.googleapis.com/auth/datastore",
  "https://www.googleapis.com/auth/cloud-platform",
];

let firestoreAdminClient: FirestoreAdmin | undefined;
let firestoreAdminPromise: Promise<FirestoreAdmin> | undefined;

export async function getFirestoreAdmin(): Promise<FirestoreAdmin> {
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

export function assertAdmin(request: CallableRequest): void {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión para ejecutar esta acción.");
  }
  if (request.auth.token.rol !== "admin") {
    throw new HttpsError("permission-denied", "Solo un administrador puede gestionar copias de seguridad.");
  }
}

export function getProjectId(): string {
  const projectId = process.env.GCLOUD_PROJECT ?? process.env.GCP_PROJECT;
  if (!projectId) {
    throw new HttpsError("internal", "No fue posible determinar el ID del proyecto.");
  }
  return projectId;
}

export function getBackupBucketName(): string {
  return process.env.BACKUP_BUCKET ?? `${getProjectId()}-backups`;
}

export function getSourceStorageBucketName(): string {
  return process.env.STORAGE_BUCKET ?? getStorage().bucket().name;
}

export function getDatabaseResourceName(): string {
  return `projects/${getProjectId()}/databases/(default)`;
}

export function formatBackupId(date: Date): string {
  return date.toISOString().replace(/[:.]/g, "-");
}

async function runInBatches<T>(items: T[], worker: (item: T) => Promise<void>): Promise<void> {
  for (let i = 0; i < items.length; i += STORAGE_COPY_CONCURRENCY) {
    const batch = items.slice(i, i + STORAGE_COPY_CONCURRENCY);
    await Promise.all(batch.map(worker));
  }
}

export async function copyStorageObjects(
  sourceBucketName: string,
  destinationBucketName: string,
  destinationPrefix: string,
): Promise<number> {
  const storage = getStorage();
  const sourceBucket = storage.bucket(sourceBucketName);
  const destinationBucket = storage.bucket(destinationBucketName);
  const [files] = await sourceBucket.getFiles();
  await runInBatches(files, async (file) => {
    await file.copy(destinationBucket.file(`${destinationPrefix}/${file.name}`));
  });
  return files.length;
}

export async function restoreStorageObjects(
  backupBucketName: string,
  backupPrefix: string,
  destinationBucketName: string,
): Promise<number> {
  const storage = getStorage();
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
