import { NavLink } from "react-router-dom";
import {
  BookTemplate,
  Bus,
  CalendarDays,
  Compass,
  CreditCard,
  ShoppingCart,
  Home,
  ListChecks,
  MapPinned,
  Settings,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { UserRole } from "@/types/usuario.types";

const allLinks: Array<{ to: string; label: string; icon: LucideIcon; roles: UserRole[] }> = [
  { to: "/dashboard", label: "Dashboard", icon: Home, roles: ["admin", "guia", "operador"] },
  { to: "/vagos", label: "Vagos", icon: Users, roles: ["admin", "operador"] },
  { to: "/guias", label: "Guías", icon: MapPinned, roles: ["admin", "operador"] },
  { to: "/transporte", label: "Transporte", icon: Bus, roles: ["admin", "operador"] },
  { to: "/plantillas", label: "Plantillas", icon: BookTemplate, roles: ["admin", "operador"] },
  { to: "/tours", label: "Tours", icon: Compass, roles: ["admin", "guia", "operador"] },
  { to: "/calendario", label: "Calendario", icon: CalendarDays, roles: ["admin", "guia", "operador"] },
  { to: "/compras", label: "Compras", icon: ShoppingCart, roles: ["admin", "operador"] },
  { to: "/reportes", label: "Reportes", icon: CreditCard, roles: ["admin", "operador"] },
  { to: "/administracion", label: "Administración", icon: ListChecks, roles: ["admin"] },
  { to: "/configuracion", label: "Configuración", icon: Settings, roles: ["admin"] },
];

interface SidebarProps {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ isCollapsed, isMobileOpen, onCloseMobile }: SidebarProps) {
  const { profile } = useAuth();
  const role = profile?.rol ?? null;
  const links = role ? allLinks.filter((item) => item.roles.includes(role)) : [];

  return (
    <>
      <aside
        className={`hidden bg-dark-900 p-4 text-textLight lg:block ${
          isCollapsed ? "w-20" : "w-64"
        } transition-all duration-200`}
      >
        <h1 className={`mb-6 font-heading text-2xl ${isCollapsed ? "sr-only" : ""}`}>Patagonia</h1>
        <nav className="space-y-2">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center rounded-md px-3 py-2 text-sm ${
                  isCollapsed ? "justify-center" : "gap-3"
                } ${isActive ? "bg-primary text-dark-900" : "hover:bg-dark-800"}`
              }
              title={label}
            >
              <Icon size={18} strokeWidth={1.8} />
              {!isCollapsed ? <span>{label}</span> : null}
            </NavLink>
          ))}
        </nav>
      </aside>

      {isMobileOpen ? (
        <div className="fixed inset-0 z-40 bg-dark-900/60 lg:hidden" onClick={onCloseMobile} />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-dark-900 p-4 text-textLight shadow-xl transition-transform duration-200 lg:hidden ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-heading text-2xl">Patagonia</h1>
          <button
            aria-label="Cerrar menú"
            className="rounded-md p-2 text-textLight hover:bg-dark-800"
            onClick={onCloseMobile}
            type="button"
          >
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>
        <nav className="space-y-2">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                  isActive ? "bg-primary text-dark-900" : "hover:bg-dark-800"
                }`
              }
              onClick={onCloseMobile}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
