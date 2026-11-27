export type CallFormat = "Google Meet" | "Phone Call" | "WhatsApp";

export interface LeadBookingDetails {
  scope?: string;
  bookingDate?: string; // YYYY-MM-DD
  bookingTime?: string; // HH:mm (24h)
  durationMinutes?: number;
  timezone?: string;
  callFormat?: CallFormat;
  calendarSynced?: boolean;
  meetingLink?: string;
  confirmationEmailsSent?: boolean;
  notes: string;
}

const META_PREFIX = "[GLYNOVA_LEAD_V1]";
const META_SUFFIX = "[/GLYNOVA_LEAD_V1]";

export const ONE_DAY_BUFFER_MS = 24 * 60 * 60 * 1000;

export function getDateStrInTimezone(date: Date, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const get = (type: string) =>
      parts.find((p) => p.type === type)?.value || "";
    const y = get("year");
    const m = get("month");
    const d = get("day");
    if (y && m && d) return `${y}-${m}-${d}`;
  } catch {
    // Fallback to browser local date
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function zonedDateTimeToUtcMs(
  dateStr: string,
  timeStr: string,
  timeZone: string
): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const utcGuess = Date.UTC(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);

  const resolvePass = (candidateMs: number) => {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const parts = fmt.formatToParts(new Date(candidateMs));
    const get = (type: string) =>
      Number(parts.find((p) => p.type === type)?.value || 0);
    const tzHour = get("hour") === 24 ? 0 : get("hour");
    const tzAsUtc = Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      tzHour,
      get("minute"),
      get("second"),
      0
    );
    return tzAsUtc - candidateMs;
  };

  try {
    const firstOffset = resolvePass(utcGuess);
    const firstPass = utcGuess - firstOffset;
    const secondOffset = resolvePass(firstPass);
    return utcGuess - secondOffset;
  } catch {
    return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0).getTime();
  }
}

export function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + days));
  const ny = dt.getUTCFullYear();
  const nm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const nd = String(dt.getUTCDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
}

export function getTomorrowDateStrInTimezone(
  timeZone: string,
  nowMs = Date.now()
): string {
  const todayStr = getDateStrInTimezone(new Date(nowMs), timeZone);
  return addDaysToDateStr(todayStr, 1);
}

export function isBookingSlotEligible(
  dateStr: string,
  timeStr: string,
  timeZone: string,
  nowMs = Date.now()
): boolean {
  if (!dateStr || !timeStr) return false;
  const todayStr = getDateStrInTimezone(new Date(nowMs), timeZone);
  if (dateStr <= todayStr) return false;

  const slotUtcMs = zonedDateTimeToUtcMs(dateStr, timeStr, timeZone);
  return slotUtcMs - nowMs >= ONE_DAY_BUFFER_MS;
}

export function isBookingDateAvailable(
  dateStr: string,
  slots: string[],
  timeZone: string,
  nowMs = Date.now()
): boolean {
  const todayStr = getDateStrInTimezone(new Date(nowMs), timeZone);
  if (dateStr <= todayStr) return false;
  return slots.some((slot) =>
    isBookingSlotEligible(dateStr, slot, timeZone, nowMs)
  );
}

export function getEarliestAvailableBooking(
  slots: string[],
  timeZone: string,
  nowMs = Date.now()
): { date: Date; dateStr: string; slot: string } {
  const todayStr = getDateStrInTimezone(new Date(nowMs), timeZone);
  for (let offset = 1; offset <= 14; offset++) {
    const candidateStr = addDaysToDateStr(todayStr, offset);
    const matchingSlot = slots.find((slot) =>
      isBookingSlotEligible(candidateStr, slot, timeZone, nowMs)
    );
    if (matchingSlot) {
      const [y, m, d] = candidateStr.split("-").map(Number);
      return {
        date: new Date(y, m - 1, d, 0, 0, 0, 0),
        dateStr: candidateStr,
        slot: matchingSlot,
      };
    }
  }
  const fallbackStr = addDaysToDateStr(todayStr, 1);
  const [y, m, d] = fallbackStr.split("-").map(Number);
  return {
    date: new Date(y, m - 1, d, 0, 0, 0, 0),
    dateStr: fallbackStr,
    slot: slots[0] || "10:00",
  };
}

export function addMinutesToTimeStr(timeStr: string, minutes: number): string {
  const [hStr, mStr] = timeStr.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return "10:45";
  const total = (h * 60 + m + minutes) % (24 * 60);
  const nh = String(Math.floor(total / 60)).padStart(2, "0");
  const nm = String(total % 60).padStart(2, "0");
  return `${nh}:${nm}`;
}

export function formatTime12h(time24?: string): string {
  if (!time24) return "";
  const [hStr, mStr] = time24.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return time24;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export function formatBookingDateLabel(dateStr?: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function encodeLeadMessage(details: LeadBookingDetails): string {
  const payload: Record<string, unknown> = {};
  if (details.scope) payload.scope = details.scope;
  if (details.bookingDate) payload.bookingDate = details.bookingDate;
  if (details.bookingTime) payload.bookingTime = details.bookingTime;
  if (details.durationMinutes) payload.durationMinutes = details.durationMinutes;
  if (details.timezone) payload.timezone = details.timezone;
  if (details.callFormat) payload.callFormat = details.callFormat;
  if (details.calendarSynced) payload.calendarSynced = true;
  if (details.meetingLink) payload.meetingLink = details.meetingLink;
  if (details.confirmationEmailsSent) payload.confirmationEmailsSent = true;

  const summaryParts: string[] = [];
  if (details.scope) summaryParts.push(`Scope: ${details.scope}`);
  if (details.bookingDate && details.bookingTime) {
    summaryParts.push(
      `Requested Slot: ${details.bookingDate} ${formatTime12h(details.bookingTime)}${
        details.timezone ? ` (${details.timezone})` : ""
      }`
    );
  }
  if (details.callFormat) summaryParts.push(`Format: ${details.callFormat}`);
  if (details.calendarSynced) summaryParts.push(`Calendar: Synced`);

  const headerLine = summaryParts.length > 0 ? `[${summaryParts.join(" · ")}]\n` : "";
  const cleanNotes = details.notes.trim();
  return `${headerLine}${cleanNotes}\n\n${META_PREFIX}${JSON.stringify(payload)}${META_SUFFIX}`.trim();
}

export function decodeLeadMessage(raw?: string | null): LeadBookingDetails {
  const text = (raw || "").trim();
  if (!text) return { notes: "" };

  const startIdx = text.indexOf(META_PREFIX);
  const endIdx = text.indexOf(META_SUFFIX);

  if (startIdx !== -1 && endIdx > startIdx) {
    const jsonRaw = text.slice(startIdx + META_PREFIX.length, endIdx);
    const beforeMeta = text.slice(0, startIdx).trim();
    const cleanedNotes = beforeMeta.replace(/^\[[^\n]*\]\s*/i, "").trim();

    try {
      const parsed = JSON.parse(jsonRaw) as Partial<LeadBookingDetails>;
      let safeMeetingLink: string | undefined;
      if (parsed.meetingLink) {
        try {
          const parsedUrl = new URL(parsed.meetingLink.trim());
          if (parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:") {
            safeMeetingLink = parsedUrl.toString();
          }
        } catch {
          // Ignore malformed meetingLink
        }
      }
      return {
        scope: parsed.scope,
        bookingDate: parsed.bookingDate,
        bookingTime: parsed.bookingTime,
        durationMinutes: parsed.durationMinutes ?? 45,
        timezone: parsed.timezone,
        callFormat: parsed.callFormat,
        calendarSynced: Boolean(parsed.calendarSynced),
        meetingLink: safeMeetingLink,
        confirmationEmailsSent: Boolean(parsed.confirmationEmailsSent),
        notes: cleanedNotes,
      };
    } catch {
      return { notes: cleanedNotes || text };
    }
  }

  // Legacy format fallback: "[Scope: Full-Stack Web App] actual message"
  const legacyMatch = text.match(/^\[Scope:\s*([^\]]+)\]\s*([\s\S]*)$/i);
  if (legacyMatch) {
    return {
      scope: legacyMatch[1].trim(),
      notes: legacyMatch[2].trim(),
    };
  }

  return { notes: text };
}
