import { Link } from "react-router-dom";

export function AccessDeniedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <article className="max-w-lg rounded-lg border border-danger/40 bg-white p-6">
        <h1 className="font-heading text-2xl text-textDark">Acceso denegado</h1>
        <p className="mt-2 text-sm text-neutral">
          Tu cuenta no tiene permisos o se encuentra inactiva. Contacta a un administrador.
        </p>
        <Link to="/login" className="mt-4 inline-block text-primary hover:underline">
          Regresar al login
        </Link>
      </article>
    </div>
  );
}
