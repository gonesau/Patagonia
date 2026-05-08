import { adminDb } from "./firebaseAdmin";

export interface PlantillasEmailFirestore {
  confirmacionCuerpoHtml?: string;
  recordatorio7dCuerpoHtml?: string;
  recordatorio1dCuerpoHtml?: string;
  linkFotosCuerpoHtml?: string;
}

export async function getPlantillasEmailConfig(): Promise<PlantillasEmailFirestore> {
  const snapshot = await adminDb.collection("configuracion").doc("global").get();
  if (!snapshot.exists) {
    return {};
  }
  const data = snapshot.data();
  const raw = data?.plantillasEmail;
  if (!raw || typeof raw !== "object") {
    return {};
  }
  const plantillas = raw as Record<string, unknown>;
  return {
    confirmacionCuerpoHtml:
      typeof plantillas.confirmacionCuerpoHtml === "string" ? plantillas.confirmacionCuerpoHtml : undefined,
    recordatorio7dCuerpoHtml:
      typeof plantillas.recordatorio7dCuerpoHtml === "string" ? plantillas.recordatorio7dCuerpoHtml : undefined,
    recordatorio1dCuerpoHtml:
      typeof plantillas.recordatorio1dCuerpoHtml === "string" ? plantillas.recordatorio1dCuerpoHtml : undefined,
    linkFotosCuerpoHtml:
      typeof plantillas.linkFotosCuerpoHtml === "string" ? plantillas.linkFotosCuerpoHtml : undefined,
  };
}
