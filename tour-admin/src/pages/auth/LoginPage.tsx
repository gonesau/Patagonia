import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";

export function LoginPage() {
  const { firebaseUser, isLoading, errorMessage, isEmbeddedBrowser, signInWithGoogle } = useAuth();

  if (firebaseUser) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-dark-900 p-4">
      <Card>
        <div className="w-full max-w-md space-y-4">
          <h1 className="font-heading text-2xl text-textDark">Ingreso al sistema Patagonia</h1>
          <p className="text-sm text-neutral">
            Solo administradores y guías previamente registrados pueden acceder.
          </p>
          {isEmbeddedBrowser ? (
            <p className="text-sm text-warning">
              Detectamos un navegador integrado. Si el login falla, abre este enlace en Safari o
              Chrome.
            </p>
          ) : null}
          {errorMessage ? <p className="text-sm text-danger">{errorMessage}</p> : null}
          <Button className="w-full" disabled={isLoading} onClick={() => void signInWithGoogle()}>
            {isLoading ? "Validando acceso..." : "Iniciar sesión con Google"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
