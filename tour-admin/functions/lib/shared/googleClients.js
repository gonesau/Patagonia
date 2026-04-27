"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDriveClient = getDriveClient;
exports.getGmailClient = getGmailClient;
const googleapis_1 = require("googleapis");
const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "";
const serviceAccountKey = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
function createAuth(scopes) {
    return new googleapis_1.google.auth.JWT({
        email: serviceAccountEmail,
        key: serviceAccountKey,
        scopes,
    });
}
function getDriveClient() {
    return googleapis_1.google.drive({
        version: "v3",
        auth: createAuth(["https://www.googleapis.com/auth/drive"]),
    });
}
function getGmailClient() {
    const senderUser = process.env.GMAIL_SENDER_USER ?? "me";
    return {
        senderUser,
        client: googleapis_1.google.gmail({
            version: "v1",
            auth: createAuth(["https://www.googleapis.com/auth/gmail.send"]),
        }),
    };
}
//# sourceMappingURL=googleClients.js.map