import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

export type BackupStatus = "pending" | "completed" | "failed" | "unknown";

export interface BackupRecord {
  id: string;
  status: BackupStatus;
  createdByEmail: string | null;
  createdAt: string | null;
  storageFilesCopied: number | null;
  errorMessage: string | null;
}

interface CreateBackupResult {
  backupId: string;
  operationName: string | null;
}

interface BackupStatusResult {
  status: BackupStatus;
}

interface RestoreBackupResult {
  operationName: string | null;
  storageFilesRestored: number;
}

export const backupService = {
  async create(): Promise<CreateBackupResult> {
    const callable = httpsCallable(functions, "createBackup");
    const result = await callable({});
    return result.data as CreateBackupResult;
  },
  async list(): Promise<BackupRecord[]> {
    const callable = httpsCallable(functions, "listBackups");
    const result = await callable({});
    return (result.data as { backups: BackupRecord[] }).backups;
  },
  async getStatus(backupId: string): Promise<BackupStatus> {
    const callable = httpsCallable(functions, "getBackupStatus");
    const result = await callable({ backupId });
    return (result.data as BackupStatusResult).status;
  },
  async restore(backupId: string, confirm: string): Promise<RestoreBackupResult> {
    const callable = httpsCallable(functions, "restoreBackup");
    const result = await callable({ backupId, confirm });
    return result.data as RestoreBackupResult;
  },
};
