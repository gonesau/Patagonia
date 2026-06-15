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

const ROLE_CLAIM_MISMATCH_MESSAGE =
  "Tu sesión quedó desactualizada tras un cambio de permisos. Inicia sesión nuevamente.";

function readTokenRole(claims: Record<string, unknown>): UserRole | null {
  const value = claims.rol;
  if (value === "admin" || value === "guia" || value === "operador") {
    return value;
  }
  return null;
}

async function assertTokenRoleMatchesProfile(user: User, profileRole: UserRole): Promise<void> {
  const tokenResult = await user.getIdTokenResult();
  const tokenRole = readTokenRole(tokenResult.claims as Record<string, unknown>);
  if (tokenRole !== null && tokenRole !== profileRole) {
    throw new Error(ROLE_CLAIM_MISMATCH_MESSAGE);
  }
}
import { timestampToDate } from "@/services/firestoreMappers";
import { usuariosSistemaService } from "@/services/usuariosSistemaService";

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

const SESSION_MAX_DURATION_MS = 6 * 60 * 60 * 1000;
const SESSION_CHECK_INTERVAL_MS = 60 * 1000;
const TOKEN_REFRESH_INTERVAL_MS = 30 * 60 * 1000;
const SESSION_START_KEY = "patagonia.sessionStartedAt";
const SESSION_EXPIRED_KEY = "patagonia.sessionExpiredNotice";
const SESSION_EXPIRED_MESSAGE = "Tu sesión expiró por seguridad. Inicia sesión nuevamente.";

function getSessionStart(): number | null {
  const raw = sessionStorage.getItem(SESSION_START_KEY);
  if (!raw) {
    return null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function setSessionStart(timestamp: number): void {
  sessionStorage.setItem(SESSION_START_KEY, String(timestamp));
}

function clearSessionStart(): void {
  sessionStorage.removeItem(SESSION_START_KEY);
}

function isSessionExpired(): boolean {
  const start = getSessionStart();
  return start !== null && Date.now() - start >= SESSION_MAX_DURATION_MS;
}

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

  const forceLogoutWithMessage = useCallback(async (message: string): Promise<void> => {
    sessionStorage.setItem(SESSION_EXPIRED_KEY, message);
    clearSessionStart();
    await signOut(auth);
  }, []);

  const forceLogoutExpired = useCallback(async (): Promise<void> => {
    await forceLogoutWithMessage(SESSION_EXPIRED_MESSAGE);
  }, [forceLogoutWithMessage]);

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

        if (!currentUser) {
          setFirebaseUser(null);
          setProfile(null);
          const expiredNotice = sessionStorage.getItem(SESSION_EXPIRED_KEY);
          if (expiredNotice) {
            sessionStorage.removeItem(SESSION_EXPIRED_KEY);
            setErrorMessage(expiredNotice);
          } else {
            setErrorMessage(null);
          }
          setIsLoading(false);
          return;
        }

        if (isSessionExpired()) {
          setProfile(null);
          await forceLogoutExpired();
          return;
        }

        setErrorMessage(null);
        setFirebaseUser(currentUser);
        if (getSessionStart() === null) {
          setSessionStart(Date.now());
        }

        try {
          const profileRole = await loadUserProfileWithRetry(currentUser.uid);
          await currentUser.getIdToken(true);
          await assertTokenRoleMatchesProfile(currentUser, profileRole);
          void usuariosSistemaService.registerLastAccess(currentUser.uid).catch(() => undefined);
        } catch (error) {
          setProfile(null);
          setErrorMessage(
            error instanceof Error ? error.message : "No fue posible cargar tu perfil.",
          );
          clearSessionStart();
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
  }, [loadUserProfileWithRetry, forceLogoutExpired]);

  useEffect(() => {
    if (!firebaseUser) {
      return;
    }
    const interval = window.setInterval(() => {
      if (isSessionExpired()) {
        void forceLogoutExpired();
      }
    }, SESSION_CHECK_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [firebaseUser, forceLogoutExpired]);

  useEffect(() => {
    if (!firebaseUser) {
      return;
    }
    const interval = window.setInterval(() => {
      void (async () => {
        try {
          await firebaseUser.getIdToken(true);
          const currentRole = profile?.rol;
          if (currentRole) {
            await assertTokenRoleMatchesProfile(firebaseUser, currentRole);
          }
        } catch {
          await forceLogoutWithMessage(ROLE_CLAIM_MISMATCH_MESSAGE);
        }
      })();
    }, TOKEN_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [firebaseUser, profile?.rol, forceLogoutWithMessage]);

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
    clearSessionStart();
    sessionStorage.removeItem(SESSION_EXPIRED_KEY);
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
