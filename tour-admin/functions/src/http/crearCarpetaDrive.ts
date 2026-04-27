import { logger } from "firebase-functions";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getDriveClient } from "../shared/googleClients";
import { adminDb } from "../shared/firebaseAdmin";

export const crearCarpetaDrive = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión para ejecutar esta acción.");
  }
  const { tourId } = request.data as { tourId?: string };
  if (!tourId) {
    throw new HttpsError("invalid-argument", "tourId es obligatorio.");
  }
  const tourRef = adminDb.collection("tours").doc(tourId);
  const tourSnapshot = await tourRef.get();
  if (!tourSnapshot.exists) {
    throw new HttpsError("not-found", "No se encontró la ocurrencia.");
  }
  const tour = tourSnapshot.data();
  if (tour?.driveFolderUrl && tour?.driveFolderId) {
    return { url: tour.driveFolderUrl, folderId: tour.driveFolderId };
  }
  const drive = getDriveClient();
  const folderName = `${tour?.nombre ?? "Tour"} - ${new Date().toLocaleDateString("es-SV")}`;
  const createdFolder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id, webViewLink",
  });
  const folderId = createdFolder.data.id;
  if (!folderId) {
    throw new HttpsError("internal", "No fue posible crear la carpeta en Drive.");
  }
  await drive.permissions.create({
    fileId: folderId,
    requestBody: { role: "reader", type: "anyone" },
  });
  const folderUrl = createdFolder.data.webViewLink ?? `https://drive.google.com/drive/folders/${folderId}`;
  await tourRef.update({ driveFolderId: folderId, driveFolderUrl: folderUrl });

  logger.info("Solicitud crearCarpetaDrive", { userId: request.auth.uid });
  return { url: folderUrl, folderId };
});
