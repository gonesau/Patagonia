import { logger } from "firebase-functions";
import ical, { ICalCalendarMethod } from "ical-generator";
import { getGmailClient } from "./googleClients";

export interface SendEmailInput {
  to: string;
  subject: string;
  htmlBody: string;
  calendar?: {
    title: string;
    description: string;
    location: string;
    start: Date;
    end: Date;
  };
}

function buildIcsAttachment(eventData: NonNullable<SendEmailInput["calendar"]>): string {
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

function toRawEmail(input: SendEmailInput): string {
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

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const emailMode = process.env.EMAIL_MODE ?? "sandbox";
  if (emailMode === "sandbox") {
    logger.info("EMAIL_MODE sandbox: email registrado sin envío real.", {
      to: input.to,
      subject: input.subject,
    });
    return;
  }

  const { client, senderUser } = getGmailClient();
  await client.users.messages.send({
    userId: senderUser,
    requestBody: {
      raw: toRawEmail(input),
    },
  });
}
