"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crearCarpetaDrive = void 0;
const firebase_functions_1 = require("firebase-functions");
const https_1 = require("firebase-functions/v2/https");
const googleClients_1 = require("../shared/googleClients");
const firebaseAdmin_1 = require("../shared/firebaseAdmin");
exports.crearCarpetaDrive = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Debes iniciar sesión para ejecutar esta acción.");
    }
    const { tourId } = request.data;
    if (!tourId) {
        throw new https_1.HttpsError("invalid-argument", "tourId es obligatorio.");
    }
    const tourRef = firebaseAdmin_1.adminDb.collection("tours").doc(tourId);
    const tourSnapshot = await tourRef.get();
    if (!tourSnapshot.exists) {
        throw new https_1.HttpsError("not-found", "No se encontró la ocurrencia.");
    }
    const tour = tourSnapshot.data();
    if (tour?.driveFolderUrl && tour?.driveFolderId) {
        return { url: tour.driveFolderUrl, folderId: tour.driveFolderId };
    }
    const drive = (0, googleClients_1.getDriveClient)();
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
        throw new https_1.HttpsError("internal", "No fue posible crear la carpeta en Drive.");
    }
    await drive.permissions.create({
        fileId: folderId,
        requestBody: { role: "reader", type: "anyone" },
    });
    const folderUrl = createdFolder.data.webViewLink ?? `https://drive.google.com/drive/folders/${folderId}`;
    await tourRef.update({ driveFolderId: folderId, driveFolderUrl: folderUrl });
    firebase_functions_1.logger.info("Solicitud crearCarpetaDrive", { userId: request.auth.uid });
    return { url: folderUrl, folderId };
});
//# sourceMappingURL=crearCarpetaDrive.js.map