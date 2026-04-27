import { NavLink } from "react-router-dom";
import { CalendarDays, Compass, CreditCard, Home, Settings, Users } from "lucide-react";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/vagos", label: "Vagos", icon: Users },
  { to: "/tours", label: "Ocurrencias", icon: Compass },
  { to: "/calendario", label: "Calendario", icon: CalendarDays },
  { to: "/reportes", label: "Reportes", icon: CreditCard },
  { to: "/configuracion", label: "Configuración", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="w-64 bg-dark-900 p-4 text-textLight">
      <h1 className="mb-6 font-heading text-2xl">Patagonia</h1>
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
          >
            <Icon size={16} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
