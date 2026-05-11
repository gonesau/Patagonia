import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ArrowRight, Loader2, AlertCircle } from "lucide-react";

export function LoginPage() {
  const { firebaseUser, isLoading, errorMessage, isEmbeddedBrowser, signInWithGoogle } = useAuth();

  if (firebaseUser) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleContinue = () => {
    void signInWithGoogle();
  };

  return (
    <div className="flex min-h-screen bg-surface dark:bg-dark-900 text-textDark dark:text-textLight font-body">
      {/* Lado Izquierdo - Visual / Glassmorphism */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-dark-900 items-center justify-center">
        {/* Mesh Gradient Background */}
        <div className="absolute top-0 left-0 w-full h-full opacity-80 mix-blend-screen pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/30 blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-secondary/20 blur-[100px]" />
          <div className="absolute top-[40%] left-[30%] w-[40%] h-[40%] rounded-full bg-success/20 blur-[90px]" />
        </div>
        
        {/* Contenido Visual */}
        <div className="relative z-10 p-12 max-w-lg">
          <div className="h-16 w-16 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center mb-8 shadow-soft">
            <span className="text-3xl font-heading font-bold text-white">P</span>
          </div>
          <h1 className="text-4xl font-heading font-bold text-white mb-6 leading-tight uppercase tracking-wider">
            SISTEMA PATAGONIA
          </h1>
          <h2 className="text-white/90 text-xl font-heading">
            Bienvenido a la administración de SoyVago
          </h2>
        </div>
      </div>

      {/* Lado Derecho - Formulario de Acceso */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 relative">
        <div className="w-full max-w-[400px] space-y-8">
          
          <div className="space-y-2 text-center lg:text-left">
            <h1 className="font-heading text-3xl font-bold tracking-tight">Te damos la bienvenida</h1>
            <p className="text-neutral">Ingresa para continuar a Patagonia Admin</p>
          </div>

          {isEmbeddedBrowser && (
            <div className="p-4 rounded-xl bg-warning/10 border border-warning/20 flex items-start gap-3 text-sm text-warning">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p>Navegador integrado detectado. Recomendamos usar Safari o Chrome.</p>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 flex items-start gap-3 text-sm text-danger">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p>{errorMessage}</p>
            </div>
          )}

          <div className="space-y-6">
            <button
              onClick={handleContinue}
              disabled={isLoading}
              className="group relative w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-primary text-white font-semibold text-base transition-all duration-300 hover:bg-[#4b8a81] hover:-translate-y-px hover:shadow-soft active:scale-[0.98] disabled:opacity-70 disabled:hover:translate-y-0 disabled:active:scale-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface dark:focus:ring-offset-dark-900"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span className="relative z-10">Iniciar sesión con Google</span>
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </div>

          {/* Footer Secundario */}
          <div className="pt-8 text-center">
             <p className="text-xs text-neutral/60">
              Al continuar, aceptas nuestros Términos de Servicio y Política de Privacidad.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
