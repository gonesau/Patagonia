import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

export const notificacionesService = {
  async sendManualReminder(tourId: string, mensajePersonalizado: string) {
    const callable = httpsCallable(functions, "enviarRecordatorioManual");
    await callable({ tourId, mensajePersonalizado });
    return { ok: true };
  },
  async sendPhotosLink(tourId: string, mensajePersonalizado: string) {
    const callable = httpsCallable(functions, "enviarLinkFotos");
    await callable({ tourId, mensajePersonalizado });
    return { ok: true };
  },
  async createDriveFolder(tourId: string) {
    const callable = httpsCallable(functions, "crearCarpetaDrive");
    const result = await callable({ tourId });
    return result.data as { url: string; folderId: string };
  },
};
