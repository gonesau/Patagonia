"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlantillasEmailConfig = getPlantillasEmailConfig;
const firebaseAdmin_1 = require("./firebaseAdmin");
async function getPlantillasEmailConfig() {
    const snapshot = await firebaseAdmin_1.adminDb.collection("configuracion").doc("global").get();
    if (!snapshot.exists) {
        return {};
    }
    const data = snapshot.data();
    const raw = data?.plantillasEmail;
    if (!raw || typeof raw !== "object") {
        return {};
    }
    const plantillas = raw;
    return {
        confirmacionCuerpoHtml: typeof plantillas.confirmacionCuerpoHtml === "string" ? plantillas.confirmacionCuerpoHtml : undefined,
        recordatorio7dCuerpoHtml: typeof plantillas.recordatorio7dCuerpoHtml === "string" ? plantillas.recordatorio7dCuerpoHtml : undefined,
        recordatorio1dCuerpoHtml: typeof plantillas.recordatorio1dCuerpoHtml === "string" ? plantillas.recordatorio1dCuerpoHtml : undefined,
        linkFotosCuerpoHtml: typeof plantillas.linkFotosCuerpoHtml === "string" ? plantillas.linkFotosCuerpoHtml : undefined,
    };
}
//# sourceMappingURL=configEmailTemplates.js.map