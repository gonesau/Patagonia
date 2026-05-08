import { HttpsError, onCall } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { adminDb } from "../shared/firebaseAdmin";
import { sendEmail } from "../shared/emailService";

type UserRole = "admin" | "guia" | "operador";

const ALLOWED_ROLES: ReadonlySet<UserRole> = new Set(["admin", "guia", "operador"]);

function isValidRole(value: unknown): value is UserRole {
  return typeof value === "string" && ALLOWED_ROLES.has(value as UserRole);
}

export const createSystemUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión para ejecutar esta acción.");
  }
  if (request.auth.token.rol !== "admin") {
    throw new HttpsError("permission-denied", "No tienes permisos para crear usuarios.");
  }

  const { email, nombre, rol, guiaId, sendInvitation } = request.data as {
    email?: string;
    nombre?: string;
    rol?: UserRole;
    guiaId?: string;
    sendInvitation?: boolean;
  };

  if (!email || !nombre || !isValidRole(rol)) {
    throw new HttpsError("invalid-argument", "email, nombre y rol son obligatorios.");
  }

  let userRecord;
  try {
    userRecord = await getAuth().getUserByEmail(email);
  } catch {
    const temporaryPassword = Math.random().toString(36).slice(-12) + "Aa1!";
    userRecord = await getAuth().createUser({
      email,
      displayName: nombre,
      password: temporaryPassword,
      emailVerified: false,
    });
  }

  await adminDb.collection("usuarios_sistema").doc(userRecord.uid).set(
    {
      email,
      nombre,
      rol,
      guiaId: guiaId ?? null,
      activo: true,
      invitacionPendiente: Boolean(sendInvitation),
      creadoEn: FieldValue.serverTimestamp(),
      actualizadoEn: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  let invitationSent = false;
  if (sendInvitation) {
    const inviteLink = await getAuth().generateSignInWithEmailLink(email, {
      url: process.env.APP_INVITE_URL ?? "https://patagonia.app/login",
      handleCodeInApp: true,
    });
    await sendEmail({
      to: email,
      subject: "Invitación de acceso a Patagonia",
      htmlBody: `<p>Hola ${nombre},</p><p>Se te ha creado acceso al sistema Patagonia con rol <strong>${rol}</strong>.</p><p>Usa este enlace para ingresar: <a href="${inviteLink}">${inviteLink}</a></p>`,
    });
    invitationSent = true;
  }

  return { uid: userRecord.uid, invitationSent };
});
