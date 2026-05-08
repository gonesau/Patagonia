type GoogleapisModule = typeof import("googleapis");

let googleApisLoaded: GoogleapisModule | undefined;

function loadGoogleApis(): GoogleapisModule {
  if (!googleApisLoaded) {
    googleApisLoaded = require("googleapis") as GoogleapisModule;
  }
  return googleApisLoaded;
}

function getGoogle() {
  return loadGoogleApis().google;
}

const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "";
const serviceAccountKey = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");

function createAuth(scopes: string[]) {
  const google = getGoogle();
  return new google.auth.JWT({
    email: serviceAccountEmail,
    key: serviceAccountKey,
    scopes,
  });
}

export function getDriveClient() {
  const google = getGoogle();
  return google.drive({
    version: "v3",
    auth: createAuth(["https://www.googleapis.com/auth/drive"]),
  });
}

export function getGmailClient() {
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
