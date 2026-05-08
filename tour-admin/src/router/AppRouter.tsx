import { Navigate, Outlet, RouterProvider, createBrowserRouter } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/hooks/useAuth";
import { LoginPage } from "@/pages/auth/LoginPage";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { VagosPage } from "@/pages/vagos/VagosPage";
import { GuiasPage } from "@/pages/guias/GuiasPage";
import { TransportePage } from "@/pages/transporte/TransportePage";
import { PlantillasPage } from "@/pages/plantillas/PlantillasPage";
import { ToursPage } from "@/pages/tours/ToursPage";
import { CalendarioPage } from "@/pages/calendario/CalendarioPage";
import { ReportesPage } from "@/pages/reportes/ReportesPage";
import { ComprasPage } from "@/pages/compras/ComprasPage";
import { ConfiguracionPage } from "@/pages/configuracion/ConfiguracionPage";
import { AdministracionPage } from "@/pages/administracion/AdministracionPage";
import { AccessDeniedPage } from "@/pages/auth/AccessDeniedPage";
import type { UserRole } from "@/types/usuario.types";
import { RouteErrorFallback } from "@/components/errors/RouteErrorFallback";

function ProtectedRoute({ roles }: { roles?: UserRole[] }) {
  const { firebaseUser, isLoading, role, errorMessage } = useAuth();

  if (isLoading) {
    return <div className="p-8 text-sm text-textDark">Cargando sesión...</div>;
  }
  if (!firebaseUser) {
    return <Navigate to="/login" replace />;
  }
  if (errorMessage) {
    return <Navigate to="/acceso-denegado" replace />;
  }
  if (roles && role && !roles.includes(role)) {
    return <Navigate to="/acceso-denegado" replace />;
  }

  return <Outlet />;
}

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage />, errorElement: <RouteErrorFallback /> },
  { path: "/acceso-denegado", element: <AccessDeniedPage />, errorElement: <RouteErrorFallback /> },
  {
    element: <ProtectedRoute />,
    errorElement: <RouteErrorFallback />,
    children: [
      {
        element: <Layout />,
        errorElement: <RouteErrorFallback />,
        children: [
          { path: "/", element: <Navigate to="/dashboard" replace /> },
          { path: "/dashboard", element: <DashboardPage /> },
          { path: "/tours", element: <ToursPage /> },
          { path: "/calendario", element: <CalendarioPage /> },
          {
            element: <ProtectedRoute roles={["admin", "operador"]} />,
            children: [
              { path: "/vagos", element: <VagosPage /> },
              { path: "/guias", element: <GuiasPage /> },
              { path: "/transporte", element: <TransportePage /> },
              { path: "/plantillas", element: <PlantillasPage /> },
              { path: "/compras", element: <ComprasPage /> },
              { path: "/reportes", element: <ReportesPage /> },
              { path: "/administracion", element: <AdministracionPage /> },
              { path: "/configuracion", element: <ConfiguracionPage /> },
            ],
          },
        ],
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
