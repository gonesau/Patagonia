import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";

export function TopBar() {
  const { profile, logout } = useAuth();

  return (
    <header className="flex items-center justify-between border-b border-border bg-white px-6 py-4">
      <div>
        <p className="text-sm text-neutral">Sistema Patagonia</p>
        <h2 className="font-heading text-xl text-textDark">SoyVago</h2>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-textDark">{profile?.nombre ?? "Sin usuario"}</span>
        <Button variant="secondary" onClick={() => void logout()}>
          Cerrar sesión
        </Button>
      </div>
    </header>
  );
}
