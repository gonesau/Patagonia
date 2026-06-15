import { lazy } from "react";
import { Navigate, Outlet, RouterProvider, createBrowserRouter } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { useAuth } from "@/hooks/useAuth";
import { LoginPage } from "@/pages/auth/LoginPage";
import { AccessDeniedPage } from "@/pages/auth/AccessDeniedPage";
import type { UserRole } from "@/types/usuario.types";
import { getDefaultRoute } from "@/auth/permissions";
import { RouteErrorFallback } from "@/components/errors/RouteErrorFallback";

const DashboardPage = lazy(() =>
  import("@/pages/dashboard/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const VagosPage = lazy(() =>
  import("@/pages/vagos/VagosPage").then((m) => ({ default: m.VagosPage })),
);
const GuiasPage = lazy(() =>
  import("@/pages/guias/GuiasPage").then((m) => ({ default: m.GuiasPage })),
);
const TransportePage = lazy(() =>
  import("@/pages/transporte/TransportePage").then((m) => ({ default: m.TransportePage })),
);
const PlantillasPage = lazy(() =>
  import("@/pages/plantillas/PlantillasPage").then((m) => ({ default: m.PlantillasPage })),
);
const ToursPage = lazy(() =>
  import("@/pages/tours/ToursPage").then((m) => ({ default: m.ToursPage })),
);
const CalendarioPage = lazy(() =>
  import("@/pages/calendario/CalendarioPage").then((m) => ({ default: m.CalendarioPage })),
);
const ReportesPage = lazy(() =>
  import("@/pages/reportes/ReportesPage").then((m) => ({ default: m.ReportesPage })),
);
const ComprasPage = lazy(() =>
  import("@/pages/compras/ComprasPage").then((m) => ({ default: m.ComprasPage })),
);
const ConfiguracionPage = lazy(() =>
  import("@/pages/configuracion/ConfiguracionPage").then((m) => ({ default: m.ConfiguracionPage })),
);
const AdministracionPage = lazy(() =>
  import("@/pages/administracion/AdministracionPage").then((m) => ({
    default: m.AdministracionPage,
  })),
);

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
  if (roles && (!role || !roles.includes(role))) {
    return <Navigate to="/acceso-denegado" replace />;
  }

  return <Outlet />;
}

function HomeRedirect() {
  const { role } = useAuth();
  return <Navigate to={getDefaultRoute(role)} replace />;
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
          { path: "/", element: <HomeRedirect /> },
          { path: "/tours", element: <ToursPage /> },
          { path: "/calendario", element: <CalendarioPage /> },
          {
            element: <ProtectedRoute roles={["admin", "guia"]} />,
            children: [
              { path: "/dashboard", element: <DashboardPage /> },
              { path: "/vagos", element: <VagosPage /> },
              { path: "/transporte", element: <TransportePage /> },
            ],
          },
          {
            element: <ProtectedRoute roles={["admin"]} />,
            children: [
              { path: "/guias", element: <GuiasPage /> },
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
