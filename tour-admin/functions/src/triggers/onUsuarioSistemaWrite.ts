import { logger } from "firebase-functions";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { getAuth } from "firebase-admin/auth";
import "../shared/firebaseAdmin";

type RolUsuario = "admin" | "guia";

const ROLES_PERMITIDOS: ReadonlySet<RolUsuario> = new Set(["admin", "guia"]);

function esRolValido(valor: unknown): valor is RolUsuario {
  return typeof valor === "string" && ROLES_PERMITIDOS.has(valor as RolUsuario);
}

export const onUsuarioSistemaWrite = onDocumentWritten(
  "usuarios_sistema/{userId}",
  async (event) => {
    const userId = event.params.userId;
    const after = event.data?.after.data();

    if (!after) {
      await limpiarClaims(userId);
      return;
    }

    const rol = after.rol;
    const activo = Boolean(after.activo);

    if (!activo || !esRolValido(rol)) {
      await limpiarClaims(userId);
      return;
    }

    await getAuth().setCustomUserClaims(userId, { rol });
    logger.info("Custom claims sincronizados", { userId, rol });
  },
);

async function limpiarClaims(userId: string): Promise<void> {
  try {
    await getAuth().setCustomUserClaims(userId, null);
    logger.info("Custom claims removidos", { userId });
  } catch (error) {
    logger.warn("No fue posible limpiar custom claims", { userId, error });
  }
}
