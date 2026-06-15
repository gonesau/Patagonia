import { Suspense, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { LayoutProvider, useLayoutModalPortal } from "./LayoutContext";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function Layout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <LayoutProvider>
      <LayoutShell
        isMobileMenuOpen={isMobileMenuOpen}
        isSidebarCollapsed={isSidebarCollapsed}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
      />
    </LayoutProvider>
  );
}

interface LayoutShellProps {
  isSidebarCollapsed: boolean;
  isMobileMenuOpen: boolean;
  onCloseMobile: () => void;
  onToggleSidebar: () => void;
  onOpenMobileMenu: () => void;
}

function LayoutShell({
  isSidebarCollapsed,
  isMobileMenuOpen,
  onCloseMobile,
  onToggleSidebar,
  onOpenMobileMenu,
}: LayoutShellProps) {
  const modalPortalRef = useLayoutModalPortal();

  return (
    <div className="flex min-h-screen bg-surface font-body">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={onCloseMobile}
      />
      <div ref={modalPortalRef} className="relative flex min-w-0 flex-1 flex-col">
        <TopBar
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={onToggleSidebar}
          onOpenMobileMenu={onOpenMobileMenu}
        />
        <main className="min-w-0 flex-1 overflow-x-hidden p-3 sm:p-4 lg:p-6">
          <Suspense
            fallback={
              <div className="p-8 text-sm text-textDark">Cargando módulo...</div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
