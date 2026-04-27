import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import "./index.css";
import { AuthProvider } from "@/context/AuthContext";
import { ConfigProvider } from "@/context/ConfigContext";
import { AppRouter } from "@/router/AppRouter";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ConfigProvider>
        <AppRouter />
        <Toaster richColors position="top-right" />
      </ConfigProvider>
    </AuthProvider>
  </StrictMode>,
)
