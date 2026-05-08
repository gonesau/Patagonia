import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export function initAdmin() {
  // Reuse firebase-admin dependency from functions workspace.
  // eslint-disable-next-line import/no-relative-packages
  const admin = require("../../functions/node_modules/firebase-admin");
  if (admin.apps.length === 0) {
    admin.initializeApp();
  }
  return admin.firestore();
}

export function isDryRun(args) {
  return args.includes("--dry-run");
}

export async function safeUpdate(ref, data, dryRun) {
  if (dryRun) {
    return;
  }
  await ref.set(data, { merge: true });
}
