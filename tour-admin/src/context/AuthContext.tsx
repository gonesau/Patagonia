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
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "@/services/firebase";
import type { UserRole, UsuarioSistema } from "@/types/usuario.types";
import { timestampToDate } from "@/services/firestoreMappers";

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UsuarioSistema | null;
  role: UserRole | null;
  isLoading: boolean;
  errorMessage: string | null;
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
};

function mapAuthErrorToMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    return AUTH_ERROR_MESSAGES[error.code] ?? `No fue posible iniciar sesión (${error.code}).`;
  }

  return "No fue posible iniciar sesión. Inténtalo de nuevo.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UsuarioSistema | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadUserProfile = useCallback(async (uid: string) => {
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
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setIsLoading(true);
      setErrorMessage(null);
      setFirebaseUser(currentUser);

      if (!currentUser) {
        setProfile(null);
        setIsLoading(false);
        return;
      }

      try {
        await loadUserProfile(currentUser.uid);
        await currentUser.getIdToken(true);
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

    return () => unsubscribe();
  }, [loadUserProfile]);

  const signInWithGoogle = useCallback(async () => {
    setErrorMessage(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      setErrorMessage(mapAuthErrorToMessage(error));
    }
  }, []);

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
      signInWithGoogle,
      logout,
    }),
    [errorMessage, firebaseUser, isLoading, logout, profile, signInWithGoogle],
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
