import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Table, type TableRow } from "@/components/ui/Table";
import { TableActions } from "@/components/ui/TableActions";
import type { Guia } from "@/types/guia.types";
import type { UserRole, UsuarioSistema } from "@/types/usuario.types";

interface UsersAdminSectionProps {
  users: UsuarioSistema[];
  guias: Guia[];
  isSubmitting: boolean;
  onCreate: (payload: {
    email: string;
    nombre: string;
    rol: UserRole;
    guiaId?: string;
    sendInvitation: boolean;
  }) => Promise<void>;
  onUpdateRole: (userId: string, role: UserRole) => Promise<void>;
  onToggleActive: (userId: string, active: boolean) => Promise<void>;
}

export function UsersAdminSection({ users, guias, isSubmitting, onCreate, onUpdateRole, onToggleActive }: UsersAdminSectionProps) {
  const [email, setEmail] = useState<string>("");
  const [nombre, setNombre] = useState<string>("");
  const [rol, setRol] = useState<UserRole>("operador");
  const [guiaId, setGuiaId] = useState<string>("");
  const [sendInvitation, setSendInvitation] = useState<boolean>(true);

  const handleCreate = async () => {
    if (!email.trim() || !nombre.trim()) {
      return;
    }
    await onCreate({
      email: email.trim(),
      nombre: nombre.trim(),
      rol,
      guiaId: guiaId || undefined,
      sendInvitation,
    });
    setEmail("");
    setNombre("");
    setRol("operador");
    setGuiaId("");
    setSendInvitation(true);
  };

  const rows: TableRow[] = users.map((user) => ({
    key: user.id,
    cells: [
      user.nombre,
      user.email,
      <select
        key={`${user.id}-role`}
        className="rounded-md border border-border px-2 py-1"
        value={user.rol}
        disabled={isSubmitting}
        onChange={(event) => void onUpdateRole(user.id, event.target.value as UserRole)}
      >
        <option value="admin">admin</option>
        <option value="guia">guia</option>
        <option value="operador">operador</option>
      </select>,
      user.activo ? "Activo" : "Inactivo",
      user.invitacionPendiente ? "Pendiente" : "Aceptada",
      <TableActions
        key={`${user.id}-actions`}
        onEdit={() => void onToggleActive(user.id, !user.activo)}
        onDelete={() => void onToggleActive(user.id, false)}
      />,
    ],
  }));

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      <div className="min-w-0">
        <Card>
          <h3 className="mb-2 font-heading text-lg">Usuarios del sistema</h3>
          <div className="grid gap-2">
          <Input label="Nombre" value={nombre} onChange={(event) => setNombre(event.target.value)} disabled={isSubmitting} />
          <Input label="Email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={isSubmitting} />
          <label className="flex flex-col gap-1 text-sm text-textDark">
            <span>Rol</span>
            <select
              className="rounded-md border border-border px-3 py-2"
              value={rol}
              onChange={(event) => setRol(event.target.value as UserRole)}
              disabled={isSubmitting}
            >
              <option value="operador">Operador</option>
              <option value="guia">Guía</option>
              <option value="admin">Administrador</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-textDark">
            <span>Vincular a guía (opcional)</span>
            <select
              className="rounded-md border border-border px-3 py-2"
              value={guiaId}
              onChange={(event) => setGuiaId(event.target.value)}
              disabled={isSubmitting || rol !== "guia"}
            >
              <option value="">Sin vínculo</option>
              {guias.map((guia) => (
                <option key={guia.id} value={guia.id}>
                  {guia.nombre} {guia.apellido}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-textDark">
            <input type="checkbox" checked={sendInvitation} onChange={(event) => setSendInvitation(event.target.checked)} />
            Enviar invitación por correo
          </label>
            <Button className="w-full" disabled={isSubmitting} onClick={() => void handleCreate()}>
              {isSubmitting ? "Guardando..." : "Crear usuario"}
            </Button>
          </div>
        </Card>
      </div>
      <div className="min-w-0 lg:col-span-2">
        <Card>
          <Table headers={["Nombre", "Email", "Rol", "Estado", "Invitación", "Acciones"]} rows={rows} />
        </Card>
      </div>
    </div>
  );
}
