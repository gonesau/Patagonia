"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
const firebase_functions_1 = require("firebase-functions");
const googleClients_1 = require("./googleClients");
function buildIcsAttachment(eventData) {
    const icalMod = require("ical-generator");
    const ical = icalMod.default;
    const ICalCalendarMethod = icalMod.ICalCalendarMethod;
    const calendar = ical({ name: "Patagonia Tours", method: ICalCalendarMethod.REQUEST });
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