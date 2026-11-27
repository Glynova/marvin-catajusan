import { describe, expect, it } from "vitest";
import {
  decodeLeadMessage,
  encodeLeadMessage,
  getEarliestAvailableBooking,
  isBookingDateAvailable,
  isBookingSlotEligible,
  zonedDateTimeToUtcMs,
} from "@/lib/leadBooking";

const SLOTS = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

describe("1-day & strict 24-hour booking buffer", () => {
  it("blocks same-day booking when client date is November 26", () => {
    const nowNov26Morning = zonedDateTimeToUtcMs("2026-11-26", "08:00", "Asia/Manila");
    expect(isBookingSlotEligible("2026-11-26", "17:00", "Asia/Manila", nowNov26Morning)).toBe(false);
    expect(isBookingDateAvailable("2026-11-26", SLOTS, "Asia/Manila", nowNov26Morning)).toBe(false);
  });

  it("enforces strict 24-hour notice for next-day slots", () => {
    const nowNov26Midday = zonedDateTimeToUtcMs("2026-11-26", "11:30", "Asia/Manila");
    expect(isBookingSlotEligible("2026-11-27", "11:00", "Asia/Manila", nowNov26Midday)).toBe(false);
    expect(isBookingSlotEligible("2026-11-27", "13:00", "Asia/Manila", nowNov26Midday)).toBe(true);

    const earliest = getEarliestAvailableBooking(SLOTS, "Asia/Manila", nowNov26Midday);
    expect(earliest.dateStr).toBe("2026-11-27");
    expect(earliest.slot).toBe("13:00");
  });

  it("skips to Nov 28 when all Nov 27 slots fall inside the 24-hour window", () => {
    const nowNov26Evening = zonedDateTimeToUtcMs("2026-11-26", "18:00", "Asia/Manila");
    expect(isBookingDateAvailable("2026-11-27", SLOTS, "Asia/Manila", nowNov26Evening)).toBe(false);

    const earliest = getEarliestAvailableBooking(SLOTS, "Asia/Manila", nowNov26Evening);
    expect(earliest.dateStr).toBe("2026-11-28");
    expect(earliest.slot).toBe("09:00");
  });

  it("round-trips structured booking metadata cleanly", () => {
    const encoded = encodeLeadMessage({
      scope: "Full-Stack Web App",
      bookingDate: "2026-11-28",
      bookingTime: "10:00",
      durationMinutes: 45,
      timezone: "Asia/Manila",
      callFormat: "Google Meet",
      calendarSynced: true,
      meetingLink: "https://meet.google.com/abc-defg-hij",
      confirmationEmailsSent: true,
      notes: "Need a multi-tenant portal.",
    });
    const decoded = decodeLeadMessage(encoded);
    expect(decoded.scope).toBe("Full-Stack Web App");
    expect(decoded.bookingDate).toBe("2026-11-28");
    expect(decoded.bookingTime).toBe("10:00");
    expect(decoded.timezone).toBe("Asia/Manila");
    expect(decoded.callFormat).toBe("Google Meet");
    expect(decoded.calendarSynced).toBe(true);
    expect(decoded.meetingLink).toBe("https://meet.google.com/abc-defg-hij");
    expect(decoded.confirmationEmailsSent).toBe(true);
    expect(decoded.notes).toBe("Need a multi-tenant portal.");
  });

  it("drops unsafe non-http meetingLink protocols when decoding", () => {
    const encoded = encodeLeadMessage({
      meetingLink: "javascript:alert(1)",
      notes: "Test note",
    });
    const decoded = decodeLeadMessage(encoded);
    expect(decoded.meetingLink).toBeUndefined();
  });
});
