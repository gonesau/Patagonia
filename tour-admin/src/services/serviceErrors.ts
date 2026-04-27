export class ServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServiceError";
  }
}

export function toServiceErrorMessage(error: unknown): string {
  if (error instanceof ServiceError) {
    return error.message;
  }
  if (error instanceof Error) {
    return "No fue posible completar la operación. Intenta nuevamente.";
  }
  return "Se produjo un error inesperado.";
}
