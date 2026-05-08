"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDriveClient = getDriveClient;
exports.getGmailClient = getGmailClient;
let googleApisLoaded;
function loadGoogleApis() {
    if (!googleApisLoaded) {
        googleApisLoaded = require("googleapis");
    }
    return googleApisLoaded;
}
function getGoogle() {
    return loadGoogleApis().google;
}
const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "";
const serviceAccountKey = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
function createAuth(scopes) {
    const google = getGoogle();
    return new google.auth.JWT({
        email: serviceAccountEmail,
        key: serviceAccountKey,
        scopes,
    });
}
function getDriveClient() {
    const google = getGoogle();
    return google.drive({
        version: "v3",
        auth: createAuth(["https://www.googleapis.com/auth/drive"]),
    });
}
function getGmailClient() {
    const google = getGoogle();
    const senderUser = process.env.GMAIL_SENDER_USER ?? "me";
    return {
        senderUser,
        client: google.gmail({
            version: "v1",
            auth: createAuth(["https://www.googleapis.com/auth/gmail.send"]),
        }),
    };
}
//# sourceMappingURL=googleClients.js.map