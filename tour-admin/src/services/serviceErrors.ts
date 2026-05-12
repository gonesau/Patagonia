import { FirebaseError } from "firebase/app";

export class ServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServiceError";
  }
}

export function toServiceErrorMessage(error: unknown): string {
  if (typeof console !== "undefined") {
    console.error("[ServiceError]", error);
  }
  if (error instanceof ServiceError) {
    return error.message;
  }
  if (error instanceof FirebaseError) {
    if (error.code === "permission-denied") {
      return "No tienes permisos para realizar esta acción. Verifica tu rol de acceso.";
    }
    if (error.code === "unauthenticated") {
      return "Tu sesión no es válida. Inicia sesión nuevamente.";
    }
  }
  if (error instanceof Error) {
    return "No fue posible completar la operación. Intenta nuevamente.";
  }
  return "Se produjo un error inesperado.";
}
