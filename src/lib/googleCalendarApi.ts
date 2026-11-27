const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

export class CalendarAuthError extends Error {
  constructor(message = "Google Calendar authorization expired. Please sign in again.") {
    super(message);
    this.name = "CalendarAuthError";
  }
}

export interface CalendarListEntry {
  id: string;
  summary: string;
  description?: string;
  timeZone?: string;
  primary?: boolean;
  backgroundColor?: string;
  accessRole: "freeBusyReader" | "reader" | "writer" | "owner";
}

export interface CalendarAttendee {
  email: string;
  displayName?: string;
  responseStatus?: string;
}

export interface CalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  hangoutLink?: string;
  status?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: CalendarAttendee[];
}

export interface CalendarSetting {
  id: string;
  value: string;
}

export interface FreeBusyPeriod {
  start: string;
  end: string;
}

export interface EventInputPayload {
  summary: string;
  description?: string;
  location?: string;
  startIso: string;
  endIso: string;
  timeZone: string;
  attendeeEmails?: string[];
  addGoogleMeet?: boolean;
}

async function calendarFetch<T>(
  path: string,
  accessToken: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${CALENDAR_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  if (res.status === 401) {
    throw new CalendarAuthError();
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      data?.error?.message || `Google Calendar request failed (${res.status})`;
    if (res.status === 403 && /insufficient|scope|token/i.test(msg)) {
      throw new CalendarAuthError(msg);
    }
    throw new Error(msg);
  }

  return data as T;
}

export async function listCalendars(
  accessToken: string
): Promise<CalendarListEntry[]> {
  const data = await calendarFetch<{ items?: CalendarListEntry[] }>(
    "/users/me/calendarList?minAccessRole=reader",
    accessToken
  );
  return data.items ?? [];
}

export async function getCalendarSettings(
  accessToken: string
): Promise<Record<string, string>> {
  const data = await calendarFetch<{ items?: CalendarSetting[] }>(
    "/users/me/settings",
    accessToken
  );
  const map: Record<string, string> = {};
  for (const item of data.items ?? []) {
    map[item.id] = item.value;
  }
  return map;
}

export async function listEvents(
  accessToken: string,
  calendarId = "primary",
  options: {
    timeMin?: string;
    timeMax?: string;
    q?: string;
    maxResults?: number;
  } = {}
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: String(options.maxResults ?? 40),
  });
  if (options.timeMin) params.set("timeMin", options.timeMin);
  if (options.timeMax) params.set("timeMax", options.timeMax);
  if (options.q?.trim()) params.set("q", options.q.trim());

  const data = await calendarFetch<{ items?: CalendarEvent[] }>(
    `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
    accessToken
  );
  return (data.items ?? []).filter((e) => e.status !== "cancelled");
}

export async function queryFreeBusy(
  accessToken: string,
  calendarIds: string[],
  timeMin: string,
  timeMax: string
): Promise<Record<string, FreeBusyPeriod[]>> {
  const data = await calendarFetch<{
    calendars?: Record<string, { busy?: FreeBusyPeriod[] }>;
  }>("/freeBusy", accessToken, {
    method: "POST",
    body: JSON.stringify({
      timeMin,
      timeMax,
      items: calendarIds.map((id) => ({ id })),
    }),
  });

  const out: Record<string, FreeBusyPeriod[]> = {};
  for (const [id, info] of Object.entries(data.calendars ?? {})) {
    out[id] = info.busy ?? [];
  }
  return out;
}

export async function createEvent(
  accessToken: string,
  calendarId: string,
  payload: EventInputPayload
): Promise<CalendarEvent> {
  const body: Record<string, unknown> = {
    summary: payload.summary,
    description: payload.description || undefined,
    location: payload.location || undefined,
    start: {
      dateTime: payload.startIso,
      timeZone: payload.timeZone,
    },
    end: {
      dateTime: payload.endIso,
      timeZone: payload.timeZone,
    },
  };

  if (payload.attendeeEmails && payload.attendeeEmails.length > 0) {
    body.attendees = payload.attendeeEmails.map((email) => ({ email }));
  }

  const params = new URLSearchParams();
  if (payload.attendeeEmails && payload.attendeeEmails.length > 0) {
    params.set("sendUpdates", "all");
  }
  if (payload.addGoogleMeet) {
    params.set("conferenceDataVersion", "1");
    body.conferenceData = {
      createRequest: {
        requestId: `glynova-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }

  const query = params.toString() ? `?${params.toString()}` : "";

  return calendarFetch<CalendarEvent>(
    `/calendars/${encodeURIComponent(calendarId)}/events${query}`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
}

export async function updateEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  payload: EventInputPayload
): Promise<CalendarEvent> {
  const body: Record<string, unknown> = {
    summary: payload.summary,
    description: payload.description ?? "",
    location: payload.location ?? "",
    start: {
      dateTime: payload.startIso,
      timeZone: payload.timeZone,
    },
    end: {
      dateTime: payload.endIso,
      timeZone: payload.timeZone,
    },
  };

  const params = new URLSearchParams();
  if (payload.attendeeEmails) {
    body.attendees = payload.attendeeEmails.map((email) => ({ email }));
    if (payload.attendeeEmails.length > 0) {
      params.set("sendUpdates", "all");
    }
  }

  const query = params.toString() ? `?${params.toString()}` : "";

  return calendarFetch<CalendarEvent>(
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}${query}`,
    accessToken,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    }
  );
}

export async function deleteEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  await calendarFetch<void>(
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    accessToken,
    {
      method: "DELETE",
    }
  );
}
