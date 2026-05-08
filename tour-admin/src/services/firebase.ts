import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  inMemoryPersistence,
  setPersistence,
  type Auth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
const functionsRegion = import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION;
export const functions = functionsRegion
  ? getFunctions(app, functionsRegion)
  : getFunctions(app);
export const googleProvider = new GoogleAuthProvider();

type AuthPersistenceStrategy = "local" | "memory" | "default";

export async function setupAuthPersistence(authInstance: Auth): Promise<AuthPersistenceStrategy> {
  try {
    await setPersistence(authInstance, browserLocalPersistence);
    return "local";
  } catch {
    try {
      await setPersistence(authInstance, inMemoryPersistence);
      return "memory";
    } catch {
      return "default";
    }
  }
}
