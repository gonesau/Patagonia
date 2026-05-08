import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { LogOut, Menu, PanelLeft, PanelLeftClose } from "lucide-react";

interface TopBarProps {
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobileMenu: () => void;
}

export function TopBar({ isSidebarCollapsed, onToggleSidebar, onOpenMobileMenu }: TopBarProps) {
  const { profile, logout } = useAuth();

  return (
    <header className="flex items-center justify-between border-b border-border bg-white px-3 py-3 sm:px-4 lg:px-6">
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          aria-label="Abrir menú"
          className="rounded-md p-2 text-textDark hover:bg-primary/10 lg:hidden"
          onClick={onOpenMobileMenu}
          type="button"
        >
          <Menu size={18} strokeWidth={1.8} />
        </button>
        <button
          aria-label={isSidebarCollapsed ? "Expandir menú lateral" : "Contraer menú lateral"}
          className="hidden rounded-md p-2 text-textDark hover:bg-primary/10 lg:inline-flex"
          onClick={onToggleSidebar}
          type="button"
        >
          {isSidebarCollapsed ? (
            <PanelLeft size={18} strokeWidth={1.8} />
          ) : (
            <PanelLeftClose size={18} strokeWidth={1.8} />
          )}
        </button>
        <div>
          <p className="text-xs text-neutral sm:text-sm">Sistema Patagonia</p>
          <h2 className="font-heading text-base text-textDark sm:text-xl">SoyVago</h2>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <span className="max-w-28 truncate text-xs text-textDark sm:max-w-none sm:text-sm">
          {profile?.nombre ?? "Sin usuario"}
        </span>
        <Button className="inline-flex items-center gap-2" variant="secondary" onClick={() => void logout()}>
          <LogOut size={16} strokeWidth={1.8} />
          <span className="hidden sm:inline">Cerrar sesión</span>
        </Button>
      </div>
    </header>
  );
}
