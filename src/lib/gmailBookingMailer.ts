import { CalendarAuthError, CalendarEvent } from "@/lib/googleCalendarApi";

export const OWNER_HOST_EMAIL = "pugoymarvin14@gmail.com";

export interface TransactionalBookingEmailInput {
  accessToken: string;
  event: CalendarEvent;
  summary: string;
  displayWindow: string;
  timeZone: string;
  location?: string;
  description?: string;
  clientEmails: string[];
  clientName?: string;
  companyName?: string;
  scope?: string;
  budget?: string;
  phone?: string;
  hostEmail?: string;
  isUpdate?: boolean;
}

export interface DualEmailDeliveryReceipt {
  clientEmailsSent: string[];
  hostEmailsSent: string[];
  failedRecipients: string[];
  meetingLink: string;
  sentAtIso: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function sanitizeSafeHttpUrl(raw?: string): string {
  if (!raw) return "";
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.toString();
    }
  } catch {
    // Ignore malformed URLs
  }
  return "";
}

function toBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function toBase64Url(input: string): string {
  return toBase64(input)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function buildMimeMessage({
  to,
  subject,
  replyTo,
  textBody,
  htmlBody,
}: {
  to: string;
  subject: string;
  replyTo?: string;
  textBody: string;
  htmlBody: string;
}): string {
  const boundary = `glynova_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const encodedSubject = `=?UTF-8?B?${toBase64(sanitizeHeaderValue(subject))}?=`;

  const headers = [
    `To: ${sanitizeHeaderValue(to)}`,
    `Subject: ${encodedSubject}`,
    replyTo ? `Reply-To: ${sanitizeHeaderValue(replyTo)}` : null,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ]
    .filter(Boolean)
    .join("\r\n");

  const raw = [
    headers,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    textBody,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    htmlBody,
    "",
    `--${boundary}--`,
  ].join("\r\n");

  return toBase64Url(raw);
}

async function sendViaGmailApi(
  accessToken: string,
  encodedRaw: string
): Promise<void> {
  const res = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: encodedRaw }),
    }
  );

  if (res.status === 401) {
    throw new CalendarAuthError(
      "Google session expired before sending confirmation emails. Please sign in again."
    );
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const msg =
      errData?.error?.message || `Gmail send failed (${res.status})`;
    if (res.status === 403 && /insufficient|scope|permission/i.test(msg)) {
      throw new CalendarAuthError(
        "Gmail send permission is missing or expired. Please sign in with Google again."
      );
    }
    throw new Error(msg);
  }
}

function buildConfirmationHtml({
  recipientRole,
  headline,
  intro,
  summary,
  displayWindow,
  timeZone,
  meetingLink,
  calendarLink,
  location,
  clientName,
  clientEmail,
  companyName,
  scope,
  budget,
  phone,
  notes,
}: {
  recipientRole: "client" | "host";
  headline: string;
  intro: string;
  summary: string;
  displayWindow: string;
  timeZone: string;
  meetingLink: string;
  calendarLink: string;
  location: string;
  clientName: string;
  clientEmail: string;
  companyName: string;
  scope: string;
  budget: string;
  phone: string;
  notes: string;
}): string {
  const safeMeet = sanitizeSafeHttpUrl(meetingLink);
  const safeCal = sanitizeSafeHttpUrl(calendarLink);

  const actionButtonHtml = safeMeet
    ? `<a href="${escapeHtml(safeMeet)}" style="display:inline-block;background-color:#024BAD;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:6px;margin-right:10px;">Join Meeting Link</a>`
    : "";

  const calendarButtonHtml = safeCal
    ? `<a href="${escapeHtml(safeCal)}" style="display:inline-block;background-color:#f3f4f6;color:#111827;text-decoration:none;font-weight:600;font-size:14px;padding:12px 18px;border-radius:6px;border:1px solid #d1d5db;">View in Google Calendar</a>`
    : "";

  const hostExtraRows =
    recipientRole === "host"
      ? `
      <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;width:130px;">Client</td><td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;">${escapeHtml(clientName || "—")} (${escapeHtml(clientEmail || "—")})</td></tr>
      ${companyName ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Company</td><td style="padding:6px 0;color:#111827;font-size:13px;">${escapeHtml(companyName)}</td></tr>` : ""}
      ${scope ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Scope</td><td style="padding:6px 0;color:#111827;font-size:13px;">${escapeHtml(scope)}</td></tr>` : ""}
      ${budget ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Budget</td><td style="padding:6px 0;color:#111827;font-size:13px;">${escapeHtml(budget)}</td></tr>` : ""}
      ${phone ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Phone / WA</td><td style="padding:6px 0;color:#111827;font-size:13px;">${escapeHtml(phone)}</td></tr>` : ""}
    `
      : "";

  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:24px;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
      <tr>
        <td style="padding:24px 28px;border-bottom:1px solid #e5e7eb;background-color:#0f172a;color:#ffffff;">
          <div style="font-size:20px;font-weight:700;letter-spacing:-0.02em;">Glynova.</div>
          <div style="font-size:12px;color:#94a3b8;margin-top:4px;">${escapeHtml(headline)}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:28px;">
          <h1 style="margin:0 0 10px 0;font-size:20px;line-height:1.3;color:#111827;">${escapeHtml(summary)}</h1>
          <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#4b5563;">${escapeHtml(intro)}</p>

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:22px;">
            <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;width:130px;">Date &amp; Time</td><td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;">${escapeHtml(displayWindow)}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Timezone</td><td style="padding:6px 0;color:#111827;font-size:13px;">${escapeHtml(timeZone)}</td></tr>
            ${location ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Format / Location</td><td style="padding:6px 0;color:#111827;font-size:13px;">${escapeHtml(location)}</td></tr>` : ""}
            ${safeMeet ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Meeting Link</td><td style="padding:6px 0;font-size:13px;"><a href="${escapeHtml(safeMeet)}" style="color:#024BAD;word-break:break-all;">${escapeHtml(safeMeet)}</a></td></tr>` : ""}
            ${hostExtraRows}
          </table>

          ${
            notes
              ? `<div style="margin-bottom:22px;">
                  <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;margin-bottom:6px;">Agenda &amp; Notes</div>
                  <div style="font-size:13px;line-height:1.6;color:#374151;white-space:pre-wrap;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:12px;">${escapeHtml(notes)}</div>
                </div>`
              : ""
          }

          <div style="margin-top:8px;">
            ${actionButtonHtml}
            ${calendarButtonHtml}
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 28px;border-top:1px solid #e5e7eb;background-color:#f9fafb;font-size:12px;color:#6b7280;">
          Marvin Catajusan · Full-Stack Engineering, Business Ops &amp; Paid Media · pugoymarvin14@gmail.com
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendDualBookingConfirmationEmails(
  input: TransactionalBookingEmailInput
): Promise<DualEmailDeliveryReceipt> {
  const meetingLink =
    sanitizeSafeHttpUrl(input.event.hangoutLink) ||
    sanitizeSafeHttpUrl(input.event.htmlLink);
  const calendarLink = sanitizeSafeHttpUrl(input.event.htmlLink);

  const normalizedHostEmails = Array.from(
    new Set(
      [OWNER_HOST_EMAIL, input.hostEmail || ""]
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.includes("@"))
    )
  );

  const normalizedClientEmails = Array.from(
    new Set(
      input.clientEmails
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.includes("@") && !normalizedHostEmails.includes(e))
    )
  );

  const actionVerb = input.isUpdate ? "Updated" : "Confirmed";
  const clientEmailsSent: string[] = [];
  const hostEmailsSent: string[] = [];
  const failedRecipients: string[] = [];

  const sendPromises: Promise<void>[] = [];

  for (const clientEmail of normalizedClientEmails) {
    const subject = `${actionVerb} Booking: ${input.summary} (${input.displayWindow})`;
    const textBody = [
      `Hi ${input.clientName || "there"},`,
      "",
      `Your session with Marvin Catajusan (Glynova) is ${actionVerb.toLowerCase()}.`,
      `Session: ${input.summary}`,
      `When: ${input.displayWindow}`,
      `Timezone: ${input.timeZone}`,
      input.location ? `Format / Location: ${input.location}` : null,
      meetingLink ? `Meeting Link: ${meetingLink}` : null,
      calendarLink && calendarLink !== meetingLink
        ? `Calendar Link: ${calendarLink}`
        : null,
      input.description ? `\nAgenda & Notes:\n${input.description}` : null,
      "",
      `If you need to reschedule, reply directly to ${OWNER_HOST_EMAIL}.`,
    ]
      .filter(Boolean)
      .join("\n");

    const htmlBody = buildConfirmationHtml({
      recipientRole: "client",
      headline: `Session ${actionVerb} · Client Copy`,
      intro: `Hi ${input.clientName || "there"}, your session with Marvin Catajusan is ${actionVerb.toLowerCase()}. Use the meeting link below at the scheduled time.`,
      summary: input.summary,
      displayWindow: input.displayWindow,
      timeZone: input.timeZone,
      meetingLink,
      calendarLink,
      location: input.location || "",
      clientName: input.clientName || "",
      clientEmail,
      companyName: input.companyName || "",
      scope: input.scope || "",
      budget: input.budget || "",
      phone: input.phone || "",
      notes: input.description || "",
    });

    const raw = buildMimeMessage({
      to: clientEmail,
      subject,
      replyTo: OWNER_HOST_EMAIL,
      textBody,
      htmlBody,
    });

    sendPromises.push(
      sendViaGmailApi(input.accessToken, raw)
        .then(() => {
          clientEmailsSent.push(clientEmail);
        })
        .catch((err) => {
          if (err instanceof CalendarAuthError) throw err;
          failedRecipients.push(clientEmail);
        })
    );
  }

  for (const hostEmail of normalizedHostEmails) {
    const subject = `[Host Copy · ${actionVerb}] ${input.summary} (${input.displayWindow})`;
    const textBody = [
      `Confirmed Booking Notification (Host Copy)`,
      "",
      `Session: ${input.summary}`,
      `When: ${input.displayWindow}`,
      `Timezone: ${input.timeZone}`,
      input.location ? `Format / Location: ${input.location}` : null,
      meetingLink ? `Meeting Link: ${meetingLink}` : null,
      calendarLink && calendarLink !== meetingLink
        ? `Calendar Event: ${calendarLink}`
        : null,
      `Client(s): ${
        normalizedClientEmails.length > 0
          ? normalizedClientEmails.join(", ")
          : input.clientName || "Self / Internal"
      }`,
      input.companyName ? `Company: ${input.companyName}` : null,
      input.scope ? `Scope: ${input.scope}` : null,
      input.budget ? `Budget: ${input.budget}` : null,
      input.phone ? `Phone / WA: ${input.phone}` : null,
      input.description ? `\nAgenda & Notes:\n${input.description}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const htmlBody = buildConfirmationHtml({
      recipientRole: "host",
      headline: `Booking ${actionVerb} · Host Briefing Copy`,
      intro: `Your booking has been ${actionVerb.toLowerCase()} on Google Calendar. Here is your host briefing and meeting link.`,
      summary: input.summary,
      displayWindow: input.displayWindow,
      timeZone: input.timeZone,
      meetingLink,
      calendarLink,
      location: input.location || "",
      clientName: input.clientName || "",
      clientEmail: normalizedClientEmails.join(", "),
      companyName: input.companyName || "",
      scope: input.scope || "",
      budget: input.budget || "",
      phone: input.phone || "",
      notes: input.description || "",
    });

    const raw = buildMimeMessage({
      to: hostEmail,
      subject,
      replyTo: normalizedClientEmails[0] || OWNER_HOST_EMAIL,
      textBody,
      htmlBody,
    });

    sendPromises.push(
      sendViaGmailApi(input.accessToken, raw)
        .then(() => {
          hostEmailsSent.push(hostEmail);
        })
        .catch((err) => {
          if (err instanceof CalendarAuthError) throw err;
          failedRecipients.push(hostEmail);
        })
    );
  }

  await Promise.all(sendPromises);

  return {
    clientEmailsSent,
    hostEmailsSent,
    failedRecipients,
    meetingLink,
    sentAtIso: new Date().toISOString(),
  };
}
