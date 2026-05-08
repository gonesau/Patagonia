import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import { Button } from "@/components/ui/Button";

export function RouteErrorFallback() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} - ${error.statusText}`
    : "No fue posible renderizar esta sección.";

  return (
    <div className="mx-auto mt-10 max-w-lg rounded-md border border-border bg-white p-6 text-center shadow-sm">
      <h2 className="mb-2 font-heading text-xl text-textDark">Error en la navegación</h2>
      <p className="mb-4 text-sm text-neutral">{message}</p>
      <Button onClick={() => window.location.assign("/")}>Volver al inicio</Button>
    </div>
  );
}
