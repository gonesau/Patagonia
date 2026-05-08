import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import "./index.css";
import { AuthProvider } from "@/context/AuthContext";
import { ConfigProvider } from "@/context/ConfigContext";
import { AppRouter } from "@/router/AppRouter";
import { AppErrorBoundary } from "@/components/errors/AppErrorBoundary";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <AuthProvider>
        <ConfigProvider>
          <AppRouter />
          <Toaster richColors position="top-right" />
        </ConfigProvider>
      </AuthProvider>
    </AppErrorBoundary>
  </StrictMode>,
)
