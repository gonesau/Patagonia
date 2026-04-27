"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
const firebase_functions_1 = require("firebase-functions");
const ical_generator_1 = __importStar(require("ical-generator"));
const googleClients_1 = require("./googleClients");
function buildIcsAttachment(eventData) {
    const calendar = (0, ical_generator_1.default)({ name: "Patagonia Tours", method: ical_generator_1.ICalCalendarMethod.REQUEST });
    calendar.createEvent({
        start: eventData.start,
        end: eventData.end,
        summary: eventData.title,
        description: eventData.description,
        location: eventData.location,
    });
    return calendar.toString();
}
function toRawEmail(input) {
    const boundary = "patagonia-multipart-boundary";
    const icsBody = input.calendar ? buildIcsAttachment(input.calendar) : "";
    const content = [
        `To: ${input.to}`,
        "Content-Type: multipart/mixed; boundary=" + boundary,
        "MIME-Version: 1.0",
        `Subject: ${input.subject}`,
        "",
        `--${boundary}`,
        "Content-Type: text/html; charset=UTF-8",
        "",
        input.htmlBody,
        input.calendar
            ? [
                `--${boundary}`,
                "Content-Type: text/calendar; charset=UTF-8; method=REQUEST",
                "Content-Transfer-Encoding: 7bit",
                "Content-Disposition: attachment; filename=evento.ics",
                "",
                icsBody,
            ].join("\n")
            : "",
        `--${boundary}--`,
    ]
        .filter(Boolean)
        .join("\n");
    return Buffer.from(content).toString("base64url");
}
async function sendEmail(input) {
    const emailMode = process.env.EMAIL_MODE ?? "sandbox";
    if (emailMode === "sandbox") {
        firebase_functions_1.logger.info("EMAIL_MODE sandbox: email registrado sin envío real.", {
            to: input.to,
            subject: input.subject,
        });
        return;
    }
    const { client, senderUser } = (0, googleClients_1.getGmailClient)();
    await client.users.messages.send({
        userId: senderUser,
        requestBody: {
            raw: toRawEmail(input),
        },
    });
}
//# sourceMappingURL=emailService.js.map