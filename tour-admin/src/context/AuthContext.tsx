import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  FirebaseError,
} from "firebase/app";
import {
  onAuthStateChanged,
  signInWithRedirect,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, googleProvider, setupAuthPersistence } from "@/services/firebase";
import type { UserRole, UsuarioSistema } from "@/types/usuario.types";
import { timestampToDate } from "@/services/firestoreMappers";

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UsuarioSistema | null;
  role: UserRole | null;
  isLoading: boolean;
  errorMessage: string | null;
  isEmbeddedBrowser: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth/unauthorized-domain":
    "Este dominio no está autorizado en Firebase Authentication. Agrégalo en Authentication → Settings → Authorized domains.",
  "auth/operation-not-allowed":
    "El inicio de sesión con Google está deshabilitado en este proyecto.",
  "auth/popup-closed-by-user":
    "Cerraste la ventana de Google antes de completar el inicio de sesión.",
  "auth/popup-blocked":
    "El navegador bloqueó la ventana emergente de Google. Permite popups e inténtalo de nuevo.",
  "auth/cancelled-popup-request": "Se canceló una solicitud de inicio de sesión previa.",
  "auth/network-request-failed":
    "Hubo un problema de red al contactar a Google. Verifica tu conexión.",
  "auth/web-storage-unsupported":
    "Tu navegador restringe el almacenamiento necesario para el login. Abre el enlace en Safari o Chrome.",
  "auth/operation-not-supported-in-this-environment":
    "Este navegador no soporta el método de inicio de sesión actual.",
  "auth/internal-error":
    "No fue posible completar el inicio de sesión en este navegador. Intenta abrir el enlace en Safari o Chrome.",
};

const EMBEDDED_BROWSER_REGEX = /(FBAN|FBAV|Instagram|Line|wv|WebView|Twitter|LinkedInApp)/i;
const PROFILE_WAIT_MAX_ATTEMPTS = 6;
const PROFILE_WAIT_DELAY_MS = 500;
const PROFILE_NOT_AUTHORIZED_MESSAGE = "Tu usuario no está autorizado para acceder al sistema.";

function detectEmbeddedBrowser(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  return EMBEDDED_BROWSER_REGEX.test(navigator.userAgent);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldFallbackToRedirect(error: unknown): boolean {
  if (error instanceof FirebaseError) {
    return [
      "auth/popup-blocked",
      "auth/web-storage-unsupported",
      "auth/operation-not-supported-in-this-environment",
      "auth/internal-error",
    ].includes(error.code);
  }
  if (error instanceof Error) {
    return /sessionstorage|unable to save initial state/i.test(error.message);
  }
  return false;
}

function mapAuthErrorToMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    return AUTH_ERROR_MESSAGES[error.code] ?? `No fue posible iniciar sesión (${error.code}).`;
  }

  return "No fue posible iniciar sesión. Inténtalo de nuevo.";
}

async function startGoogleRedirect(): Promise<void> {
  try {
    await signInWithRedirect(auth, googleProvider);
  } catch (error) {
    throw new Error(mapAuthErrorToMessage(error));
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UsuarioSistema | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEmbeddedBrowser] = useState<boolean>(() => detectEmbeddedBrowser());

  const loadUserProfile = useCallback(async (uid: string): Promise<UserRole> => {
    const userRef = doc(db, "usuarios_sistema", uid);
    const snapshot = await getDoc(userRef);
    if (!snapshot.exists()) {
      throw new Error("Tu usuario no está autorizado para acceder al sistema.");
    }
    const data = timestampToDate(snapshot.data() as Omit<UsuarioSistema, "id">);
    if (!data.activo) {
      throw new Error("Tu usuario está desactivado, contacta a un administrador.");
    }

    setProfile({
      ...data,
      id: uid,
    });

    return data.rol;
  }, []);

  const loadUserProfileWithRetry = useCallback(async (uid: string): Promise<UserRole> => {
    let lastError: unknown;
    for (let attempt = 0; attempt < PROFILE_WAIT_MAX_ATTEMPTS; attempt += 1) {
      try {
        return await loadUserProfile(uid);
      } catch (error) {
        lastError = error;
        const shouldRetry =
          error instanceof Error &&
          error.message === PROFILE_NOT_AUTHORIZED_MESSAGE &&
          attempt < PROFILE_WAIT_MAX_ATTEMPTS - 1;
        if (!shouldRetry) {
          throw error;
        }
        await delay(PROFILE_WAIT_DELAY_MS);
      }
    }
    throw (lastError instanceof Error ? lastError : new Error("No fue posible cargar tu perfil."));
  }, [loadUserProfile]);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: () => void = () => {};

    const initializeAuth = async () => {
      await setupAuthPersistence(auth);
      if (!isMounted) {
        return;
      }
      unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        setIsLoading(true);
        setErrorMessage(null);
        setFirebaseUser(currentUser);

        if (!currentUser) {
          setProfile(null);
          setIsLoading(false);
          return;
        }

        try {
          await loadUserProfileWithRetry(currentUser.uid);
        } catch (error) {
          setProfile(null);
          setErrorMessage(
            error instanceof Error ? error.message : "No fue posible cargar tu perfil.",
          );
          await signOut(auth);
        } finally {
          setIsLoading(false);
        }
      });
    };

    void initializeAuth();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [loadUserProfileWithRetry]);

  const signInWithGoogle = useCallback(async () => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      if (isEmbeddedBrowser) {
        await startGoogleRedirect();
        return;
      }
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      if (shouldFallbackToRedirect(error)) {
        try {
          await startGoogleRedirect();
        } catch (redirectError) {
          setErrorMessage(
            redirectError instanceof Error
              ? redirectError.message
              : "No fue posible redirigir a Google. Inténtalo de nuevo.",
          );
        }
        return;
      }
      setErrorMessage(mapAuthErrorToMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [isEmbeddedBrowser]);

  const logout = useCallback(async () => {
    await signOut(auth);
    setProfile(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      firebaseUser,
      profile,
      role: profile?.rol ?? null,
      isLoading,
      errorMessage,
      isEmbeddedBrowser,
      signInWithGoogle,
      logout,
    }),
    [errorMessage, firebaseUser, isEmbeddedBrowser, isLoading, logout, profile, signInWithGoogle],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext debe usarse dentro de AuthProvider.");
  }

  return context;
}
