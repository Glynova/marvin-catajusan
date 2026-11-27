import { useCallback, useEffect, useMemo, useState } from "react";
import { User } from "firebase/auth";
import {
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  Video,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { useToast } from "@/hooks/use-toast";
import {
  clearCachedToken,
  getAccessToken,
  googleSignIn,
  initAuth,
  logout,
} from "@/lib/googleCalendarAuth";
import {
  CalendarAuthError,
  CalendarEvent,
  CalendarListEntry,
  createEvent,
  deleteEvent,
  EventInputPayload,
  FreeBusyPeriod,
  getCalendarSettings,
  listCalendars,
  listEvents,
  queryFreeBusy,
  updateEvent,
} from "@/lib/googleCalendarApi";
import {
  addMinutesToTimeStr,
  getEarliestAvailableBooking,
  getTomorrowDateStrInTimezone,
  isBookingSlotEligible,
  zonedDateTimeToUtcMs,
} from "@/lib/leadBooking";
import {
  DualEmailDeliveryReceipt,
  OWNER_HOST_EMAIL,
  sendDualBookingConfirmationEmails,
} from "@/lib/gmailBookingMailer";

export interface PrefillLeadData {
  name?: string;
  email?: string;
  business?: string;
  scope?: string;
  budget?: string;
  phone?: string;
  message?: string;
  dateStr?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  addGoogleMeet?: boolean;
}

interface GoogleCalendarWorkspaceProps {
  variant?: "compact" | "full";
  prefillLead?: PrefillLeadData | null;
  onEventCreated?: (
    event: CalendarEvent,
    receipt?: DualEmailDeliveryReceipt
  ) => void;
  enforceOneDayBuffer?: boolean;
}

type RangePreset = "today" | "7d" | "30d";

type PendingMutation =
  | {
      type: "create";
      calendarSummary: string;
      payload: EventInputPayload;
      displayWindow: string;
      sendEmails: boolean;
    }
  | {
      type: "update";
      calendarSummary: string;
      eventId: string;
      originalSummary: string;
      payload: EventInputPayload;
      displayWindow: string;
      sendEmails: boolean;
    }
  | {
      type: "delete";
      calendarSummary: string;
      event: CalendarEvent;
    };

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toLocalTimeStr(d: Date): string {
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${min}`;
}

const BUFFER_SLOTS = [
  "09:00",
  "10:00",
  "11:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
];

function getDefaultDateAndTimes(enforceOneDayBuffer = false, tz = "UTC") {
  if (enforceOneDayBuffer) {
    const earliest = getEarliestAvailableBooking(BUFFER_SLOTS, tz);
    return {
      date: earliest.dateStr,
      startTime: earliest.slot,
      endTime: addMinutesToTimeStr(earliest.slot, 45),
    };
  }
  const now = new Date();
  const next = new Date(now.getTime() + 60 * 60 * 1000);
  next.setMinutes(0, 0, 0);
  if (next.getHours() < 9) next.setHours(10, 0, 0, 0);
  const end = new Date(next.getTime() + 45 * 60 * 1000);
  return {
    date: toLocalDateStr(next),
    startTime: toLocalTimeStr(next),
    endTime: toLocalTimeStr(end),
  };
}

function formatEventWindow(event: CalendarEvent): string {
  if (event.start.date && !event.start.dateTime) {
    return `${event.start.date} · All day`;
  }
  const startRaw = event.start.dateTime;
  const endRaw = event.end.dateTime;
  if (!startRaw) return "";
  const startDate = new Date(startRaw);
  const endDate = endRaw ? new Date(endRaw) : null;

  const dateLabel = startDate.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const startTimeLabel = startDate.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const endTimeLabel = endDate
    ? endDate.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  return endTimeLabel
    ? `${dateLabel} · ${startTimeLabel} – ${endTimeLabel}`
    : `${dateLabel} · ${startTimeLabel}`;
}

function buildIsoFromLocal(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
  return dt.toISOString();
}

const GoogleCalendarWorkspace = ({
  variant = "full",
  prefillLead,
  onEventCreated,
  enforceOneDayBuffer = false,
}: GoogleCalendarWorkspaceProps) => {
  const { toast } = useToast();
  const [needsAuth, setNeedsAuth] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [calendars, setCalendars] = useState<CalendarListEntry[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>("primary");
  const [timeZone, setTimeZone] = useState<string>(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  );
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [rangePreset, setRangePreset] = useState<RangePreset>("7d");
  const [searchQuery, setSearchQuery] = useState("");
  const [busyPeriods, setBusyPeriods] = useState<FreeBusyPeriod[]>([]);
  const [checkingFreeBusy, setCheckingFreeBusy] = useState(false);

  // Composer / Edit state
  const defaults = useMemo(
    () => getDefaultDateAndTimes(enforceOneDayBuffer, timeZone),
    [enforceOneDayBuffer, timeZone]
  );
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingOriginalSummary, setEditingOriginalSummary] = useState("");
  const [summary, setSummary] = useState(() =>
    prefillLead?.name
      ? `Technical & Growth Audit — ${prefillLead.name}`
      : "Technical & Growth Audit — Glynova"
  );
  const [dateStr, setDateStr] = useState(prefillLead?.dateStr || defaults.date);
  const [startTime, setStartTime] = useState(prefillLead?.startTime || defaults.startTime);
  const [endTime, setEndTime] = useState(prefillLead?.endTime || defaults.endTime);
  const [attendeesRaw, setAttendeesRaw] = useState(() =>
    prefillLead?.email ? prefillLead.email : ""
  );
  const [location, setLocation] = useState(prefillLead?.location || "");
  const [description, setDescription] = useState(() => {
    const parts: string[] = [];
    if (prefillLead?.business) parts.push(`Company: ${prefillLead.business}`);
    if (prefillLead?.message) parts.push(`Notes: ${prefillLead.message}`);
    return parts.join("\n");
  });
  const [addGoogleMeet, setAddGoogleMeet] = useState(
    typeof prefillLead?.addGoogleMeet === "boolean" ? prefillLead.addGoogleMeet : true
  );
  const [sendConfirmationEmails, setSendConfirmationEmails] = useState(true);
  const [lastEmailReceipt, setLastEmailReceipt] =
    useState<DualEmailDeliveryReceipt | null>(null);
  const [copiedMeetLink, setCopiedMeetLink] = useState(false);

  const [pendingMutation, setPendingMutation] =
    useState<PendingMutation | null>(null);
  const [executingMutation, setExecutingMutation] = useState(false);

  useEffect(() => {
    if (prefillLead) {
      setEditingEventId(null);
      setSummary(
        prefillLead.name
          ? `Technical & Growth Audit — ${prefillLead.name}`
          : "Technical & Growth Audit — Glynova"
      );
      if (prefillLead.dateStr) setDateStr(prefillLead.dateStr);
      if (prefillLead.startTime) setStartTime(prefillLead.startTime);
      if (prefillLead.endTime) setEndTime(prefillLead.endTime);
      setAttendeesRaw(prefillLead.email || "");
      setLocation(prefillLead.location || "");
      if (typeof prefillLead.addGoogleMeet === "boolean") {
        setAddGoogleMeet(prefillLead.addGoogleMeet);
      }
      const parts: string[] = [];
      if (prefillLead.business) parts.push(`Company: ${prefillLead.business}`);
      if (prefillLead.message) parts.push(`Notes: ${prefillLead.message}`);
      setDescription(parts.join("\n"));
    }
  }, [prefillLead]);

  const handleAuthError = useCallback(
    (err: unknown) => {
      if (err instanceof CalendarAuthError) {
        clearCachedToken();
        setToken(null);
        setNeedsAuth(true);
        toast({
          title: "Google Calendar session expired",
          description: "Please sign in with Google again to continue.",
          variant: "destructive",
        });
        return true;
      }
      return false;
    },
    [toast]
  );

  const loadCalendarMetadata = useCallback(
    async (accessToken: string) => {
      try {
        const [calList, settings] = await Promise.all([
          listCalendars(accessToken),
          getCalendarSettings(accessToken).catch(() => ({} as Record<string, string>)),
        ]);
        setCalendars(calList);
        const primaryCal = calList.find((c) => c.primary) || calList[0];
        if (primaryCal) {
          setSelectedCalendarId(primaryCal.id);
          if (primaryCal.timeZone) setTimeZone(primaryCal.timeZone);
        }
        if (settings.timezone) {
          setTimeZone(settings.timezone);
        }
      } catch (err) {
        if (!handleAuthError(err)) {
          toast({
            title: "Unable to load calendars",
            description:
              err instanceof Error ? err.message : "Failed to fetch calendars.",
            variant: "destructive",
          });
        }
      }
    },
    [handleAuthError, toast]
  );

  const fetchAgenda = useCallback(
    async (accessToken: string, calId: string, preset: RangePreset, q: string) => {
      setLoadingEvents(true);
      try {
        const now = new Date();
        const timeMin = new Date(now);
        if (preset === "today") {
          timeMin.setHours(0, 0, 0, 0);
        }
        const timeMax = new Date(now);
        if (preset === "today") {
          timeMax.setHours(23, 59, 59, 999);
        } else if (preset === "7d") {
          timeMax.setDate(timeMax.getDate() + 7);
        } else {
          timeMax.setDate(timeMax.getDate() + 30);
        }

        const items = await listEvents(accessToken, calId, {
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          q,
          maxResults: variant === "compact" ? 15 : 40,
        });
        setEvents(items);
      } catch (err) {
        if (!handleAuthError(err)) {
          toast({
            title: "Failed to load events",
            description:
              err instanceof Error ? err.message : "Could not load calendar events.",
            variant: "destructive",
          });
        }
      } finally {
        setLoadingEvents(false);
      }
    },
    [handleAuthError, toast, variant]
  );

  const refreshFreeBusy = useCallback(
    async (accessToken: string, calId: string, targetDate: string) => {
      if (!targetDate) return;
      setCheckingFreeBusy(true);
      try {
        const dayStart = buildIsoFromLocal(targetDate, "00:00");
        const dayEnd = buildIsoFromLocal(targetDate, "23:59");
        const result = await queryFreeBusy(
          accessToken,
          [calId],
          dayStart,
          dayEnd
        );
        setBusyPeriods(result[calId] ?? []);
      } catch (err) {
        handleAuthError(err);
      } finally {
        setCheckingFreeBusy(false);
      }
    },
    [handleAuthError]
  );

  useEffect(() => {
    const unsub = initAuth(
      async (authUser, accessToken) => {
        setUser(authUser);
        setToken(accessToken);
        setNeedsAuth(false);
        await loadCalendarMetadata(accessToken);
      },
      () => {
        setToken(null);
        setNeedsAuth(true);
      }
    );

    // Sync if token already exists in memory on mount
    getAccessToken().then((existing) => {
      if (existing) {
        setToken(existing);
        setNeedsAuth(false);
        loadCalendarMetadata(existing);
      }
    });

    return () => unsub();
  }, [loadCalendarMetadata]);

  useEffect(() => {
    if (!token || needsAuth) return;
    fetchAgenda(token, selectedCalendarId, rangePreset, searchQuery);
  }, [token, needsAuth, selectedCalendarId, rangePreset, searchQuery, fetchAgenda]);

  useEffect(() => {
    if (!token || needsAuth || !dateStr) return;
    refreshFreeBusy(token, selectedCalendarId, dateStr);
  }, [token, needsAuth, selectedCalendarId, dateStr, refreshFreeBusy]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      setUser(result.user);
      setToken(result.accessToken);
      setNeedsAuth(false);
      await loadCalendarMetadata(result.accessToken);
      toast({
        title: "Google Calendar connected",
        description: `Signed in as ${result.user.email || "Google user"}.`,
      });
    } catch (err) {
      toast({
        title: "Sign-in cancelled or failed",
        description:
          err instanceof Error ? err.message : "Could not connect Google Calendar.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDisconnect = async () => {
    await logout();
    setToken(null);
    setUser(null);
    setCalendars([]);
    setEvents([]);
    setBusyPeriods([]);
    setNeedsAuth(true);
    toast({
      title: "Google Calendar disconnected",
      description: "Your calendar session has been cleared.",
    });
  };

  const selectedCalendar = useMemo(
    () => calendars.find((c) => c.id === selectedCalendarId),
    [calendars, selectedCalendarId]
  );

  const canWriteCalendar = useMemo(() => {
    if (!selectedCalendar) return true;
    return (
      selectedCalendar.accessRole === "owner" ||
      selectedCalendar.accessRole === "writer"
    );
  }, [selectedCalendar]);

  const slotConflict = useMemo(() => {
    if (!dateStr || !startTime || !endTime || busyPeriods.length === 0) {
      return null;
    }
    const startMs = zonedDateTimeToUtcMs(dateStr, startTime, timeZone);
    const endMs = zonedDateTimeToUtcMs(dateStr, endTime, timeZone);
    if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
      return null;
    }
    const overlapping = busyPeriods.filter((b) => {
      const bStart = new Date(b.start).getTime();
      const bEnd = new Date(b.end).getTime();
      return startMs < bEnd && endMs > bStart;
    });
    return overlapping.length > 0 ? overlapping.length : 0;
  }, [busyPeriods, dateStr, startTime, endTime, timeZone]);

  const applyDurationPreset = (minutes: number) => {
    if (!startTime) return;
    setEndTime(addMinutesToTimeStr(startTime, minutes));
  };

  const resetForm = () => {
    setEditingEventId(null);
    setEditingOriginalSummary("");
    setSummary(
      prefillLead?.name
        ? `Technical & Growth Audit — ${prefillLead.name}`
        : "Technical & Growth Audit — Glynova"
    );
    const fresh = getDefaultDateAndTimes(enforceOneDayBuffer, timeZone);
    setDateStr(fresh.date);
    setStartTime(fresh.startTime);
    setEndTime(fresh.endTime);
    setAttendeesRaw(prefillLead?.email || "");
    setLocation("");
    setDescription("");
    setAddGoogleMeet(true);
  };

  const startEditingEvent = (event: CalendarEvent) => {
    setEditingEventId(event.id);
    setEditingOriginalSummary(event.summary || "Untitled event");
    setSummary(event.summary || "");
    if (event.start.dateTime) {
      const s = new Date(event.start.dateTime);
      setDateStr(toLocalDateStr(s));
      setStartTime(toLocalTimeStr(s));
    }
    if (event.end.dateTime) {
      const e = new Date(event.end.dateTime);
      setEndTime(toLocalTimeStr(e));
    }
    setAttendeesRaw(
      (event.attendees ?? []).map((a) => a.email).filter(Boolean).join(", ")
    );
    setLocation(event.location || "");
    setDescription(event.description || "");
    setAddGoogleMeet(false);
  };

  const minDateStr = useMemo(
    () =>
      enforceOneDayBuffer ? getTomorrowDateStrInTimezone(timeZone) : undefined,
    [enforceOneDayBuffer, timeZone]
  );

  const bufferViolation = useMemo(() => {
    if (!enforceOneDayBuffer || !dateStr || !startTime) return false;
    return !isBookingSlotEligible(dateStr, startTime, timeZone);
  }, [enforceOneDayBuffer, dateStr, startTime, timeZone]);

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWriteCalendar) {
      toast({
        title: "Read-only calendar",
        description: "Switch to a calendar you own or have write access to.",
        variant: "destructive",
      });
      return;
    }

    if (bufferViolation) {
      toast({
        title: "24-hour advance notice required",
        description:
          "Same-day scheduling is unavailable. Please choose a date and time at least 24 hours from now.",
        variant: "destructive",
      });
      return;
    }

    const startIso = new Date(
      zonedDateTimeToUtcMs(dateStr, startTime, timeZone)
    ).toISOString();
    const endIso = new Date(
      zonedDateTimeToUtcMs(dateStr, endTime, timeZone)
    ).toISOString();
    if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      toast({
        title: "Invalid time window",
        description: "End time must be after start time.",
        variant: "destructive",
      });
      return;
    }

    const attendeeEmails = attendeesRaw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.includes("@"));

    const payload: EventInputPayload = {
      summary: summary.trim() || "Glynova Session",
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      startIso,
      endIso,
      timeZone,
      attendeeEmails,
      addGoogleMeet: editingEventId ? false : addGoogleMeet,
    };

    const displayWindow = `${dateStr} · ${startTime} – ${endTime} (${timeZone})`;
    const calName = selectedCalendar?.summary || "Primary Calendar";

    if (editingEventId) {
      setPendingMutation({
        type: "update",
        calendarSummary: calName,
        eventId: editingEventId,
        originalSummary: editingOriginalSummary,
        payload,
        displayWindow,
        sendEmails: sendConfirmationEmails,
      });
    } else {
      setPendingMutation({
        type: "create",
        calendarSummary: calName,
        payload,
        displayWindow,
        sendEmails: sendConfirmationEmails,
      });
    }
  };

  const handleRequestDelete = (event: CalendarEvent) => {
    setPendingMutation({
      type: "delete",
      calendarSummary: selectedCalendar?.summary || "Primary Calendar",
      event,
    });
  };

  const executeConfirmedMutation = async () => {
    if (!pendingMutation || !token) return;
    setExecutingMutation(true);
    try {
      if (
        pendingMutation.type === "create" ||
        pendingMutation.type === "update"
      ) {
        const isUpdate = pendingMutation.type === "update";
        const savedEvent = isUpdate
          ? await updateEvent(
              token,
              selectedCalendarId,
              pendingMutation.eventId,
              pendingMutation.payload
            )
          : await createEvent(
              token,
              selectedCalendarId,
              pendingMutation.payload
            );

        let emailReceipt: DualEmailDeliveryReceipt | undefined;
        if (pendingMutation.sendEmails) {
          emailReceipt = await sendDualBookingConfirmationEmails({
            accessToken: token,
            event: savedEvent,
            summary: pendingMutation.payload.summary,
            displayWindow: pendingMutation.displayWindow,
            timeZone: pendingMutation.payload.timeZone,
            location: pendingMutation.payload.location,
            description: pendingMutation.payload.description,
            clientEmails: pendingMutation.payload.attendeeEmails ?? [],
            clientName: prefillLead?.name,
            companyName: prefillLead?.business,
            scope: prefillLead?.scope,
            budget: prefillLead?.budget,
            phone: prefillLead?.phone,
            hostEmail: user?.email || OWNER_HOST_EMAIL,
            isUpdate,
          });
          setLastEmailReceipt(emailReceipt);
        }

        const totalEmails =
          (emailReceipt?.clientEmailsSent.length ?? 0) +
          (emailReceipt?.hostEmailsSent.length ?? 0);

        toast({
          title: isUpdate
            ? "Booking updated & confirmation sent"
            : "Booking confirmed & emails sent",
          description: emailReceipt
            ? `"${savedEvent.summary || pendingMutation.payload.summary}" saved. Confirmation emails with meeting link sent to ${totalEmails} recipient${totalEmails === 1 ? "" : "s"}.`
            : `"${savedEvent.summary || pendingMutation.payload.summary}" saved to ${pendingMutation.calendarSummary}.`,
        });

        resetForm();
        if (!isUpdate) {
          onEventCreated?.(savedEvent, emailReceipt);
        }
      } else if (pendingMutation.type === "delete") {
        await deleteEvent(
          token,
          selectedCalendarId,
          pendingMutation.event.id
        );
        toast({
          title: "Event deleted",
          description: `"${pendingMutation.event.summary || "Untitled event"}" was removed.`,
        });
        if (editingEventId === pendingMutation.event.id) {
          resetForm();
        }
      }

      setPendingMutation(null);
      await Promise.all([
        fetchAgenda(token, selectedCalendarId, rangePreset, searchQuery),
        refreshFreeBusy(token, selectedCalendarId, dateStr),
      ]);
    } catch (err) {
      if (!handleAuthError(err)) {
        toast({
          title: "Calendar update failed",
          description:
            err instanceof Error ? err.message : "Could not complete request.",
          variant: "destructive",
        });
      }
    } finally {
      setExecutingMutation(false);
    }
  };

  if (needsAuth || !token) {
    return (
      <div className="card-glass p-6 md:p-8 flex flex-col items-start gap-5">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <CalendarIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-heading text-lg font-bold text-foreground">
              Connect Google Calendar
            </h3>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Sign in with Google to view your calendars, check free/busy availability, and schedule or manage technical audit sessions directly with your permission.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-1">
          <GoogleSignInButton
            onClick={handleLogin}
            disabled={isLoggingIn}
            label={isLoggingIn ? "Connecting…" : "Sign in with Google"}
          />
          <span className="text-xs text-muted-foreground">
            Includes Google Meet link generation &amp; conflict checking
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connected Bar */}
      <div className="card-glass p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || "Google account"}
              className="w-9 h-9 rounded-full border border-border"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center text-primary font-semibold text-sm">
              {(user?.displayName || user?.email || "G").charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {user?.displayName || "Google Calendar Connected"}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-500">
                <CheckCircle2 className="h-3.5 w-3.5" /> Connected
              </span>
            </div>
            <p className="text-xs text-muted-foreground tabular-nums">
              {user?.email} · {timeZone}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {calendars.length > 0 && (
            <Select
              value={selectedCalendarId}
              onValueChange={(val) => setSelectedCalendarId(val)}
            >
              <SelectTrigger className="w-[220px] h-9 text-xs bg-secondary/70 border-border">
                <SelectValue placeholder="Select calendar" />
              </SelectTrigger>
              <SelectContent>
                {calendars.map((cal) => (
                  <SelectItem key={cal.id} value={cal.id}>
                    {cal.summary} {cal.primary ? "(Primary)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              fetchAgenda(token, selectedCalendarId, rangePreset, searchQuery);
              refreshFreeBusy(token, selectedCalendarId, dateStr);
            }}
            disabled={loadingEvents}
            className="h-9 gap-1.5"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loadingEvents ? "animate-spin" : ""}`}
            />
            Sync
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDisconnect}
            className="h-9 gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
            Disconnect
          </Button>
        </div>
      </div>

      {/* Main Split: Composer + Upcoming Agenda */}
      <div
        className={
          variant === "full"
            ? "grid lg:grid-cols-12 gap-6 items-start"
            : "space-y-6"
        }
      >
        {/* Schedule / Edit Form */}
        <form
          onSubmit={handleRequestSubmit}
          className={`${
            variant === "full" ? "lg:col-span-5" : ""
          } card-glass p-5 sm:p-6 space-y-4`}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-heading text-lg font-bold text-foreground">
                {editingEventId ? "Edit Calendar Event" : "Schedule Session"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {canWriteCalendar
                  ? `Writing to ${selectedCalendar?.summary || "Primary Calendar"}`
                  : "Selected calendar is read-only"}
              </p>
              {enforceOneDayBuffer && (
                <p className="text-xs text-primary/90 mt-1">
                  Same-day booking unavailable · Minimum 24-hour advance notice required
                </p>
              )}
            </div>
            {editingEventId && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetForm}
                className="text-xs h-8"
              >
                Cancel Edit
              </Button>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Event Title
            </label>
            <Input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Technical & Growth Audit"
              required
              className="bg-secondary/60 border-border"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Date
              </label>
              <Input
                type="date"
                value={dateStr}
                min={minDateStr}
                onChange={(e) => setDateStr(e.target.value)}
                required
                className="bg-secondary/60 border-border tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Start
              </label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="bg-secondary/60 border-border tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                End
              </label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="bg-secondary/60 border-border tabular-nums"
              />
            </div>
          </div>

          {/* Quick durations + live Free/Busy availability check */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-1.5">
              {[30, 45, 60].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => applyDurationPreset(mins)}
                  className="px-2 py-1 text-xs font-medium rounded border border-border bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors tabular-nums"
                >
                  {mins}m
                </button>
              ))}
            </div>

            <div className="text-xs tabular-nums">
              {checkingFreeBusy ? (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Checking slot…
                </span>
              ) : slotConflict === null ? null : slotConflict === 0 ? (
                <span className="inline-flex items-center gap-1 text-emerald-500 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Slot available
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-500 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" /> Conflicts with{" "}
                  {slotConflict} event{slotConflict > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Attendee Email(s)
            </label>
            <Input
              value={attendeesRaw}
              onChange={(e) => setAttendeesRaw(e.target.value)}
              placeholder="client@company.com, team@glynova.dev"
              className="bg-secondary/60 border-border"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Location (optional)
            </label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Remote / Office"
              className="bg-secondary/60 border-border"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Agenda / Notes
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Architecture review, CRM workflow audit, paid media attribution…"
              rows={variant === "compact" ? 2 : 3}
              className="bg-secondary/60 border-border"
            />
          </div>

          {!editingEventId && (
            <label className="flex items-center gap-2.5 text-xs font-medium text-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={addGoogleMeet}
                onChange={(e) => setAddGoogleMeet(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              <Video className="h-3.5 w-3.5 text-primary" />
              Attach Google Meet video conferencing link
            </label>
          )}

          <label className="flex items-start gap-2.5 text-xs font-medium text-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={sendConfirmationEmails}
              onChange={(e) => setSendConfirmationEmails(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary mt-0.5"
            />
            <Mail className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <span>
              Send transactional confirmation email with meeting link to both client &amp; host ({user?.email || OWNER_HOST_EMAIL})
            </span>
          </label>

          {bufferViolation && (
            <p className="text-xs text-amber-500 font-medium flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Selected date and time must be at least 24 hours from now.
            </p>
          )}

          <Button
            type="submit"
            variant="hero"
            size="default"
            disabled={!canWriteCalendar || bufferViolation}
            className="w-full gap-1.5"
          >
            {editingEventId ? (
              <>
                <Pencil className="h-4 w-4" /> Review &amp; Update Event
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" /> Review &amp; Confirm Booking
              </>
            )}
          </Button>

          {lastEmailReceipt && (
            <div className="rounded-lg border border-border bg-secondary/45 p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-foreground inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  Transactional Confirmation Emails Sent
                </span>
                <button
                  type="button"
                  onClick={() => setLastEmailReceipt(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Dismiss
                </button>
              </div>
              <div className="text-muted-foreground space-y-1 tabular-nums">
                {lastEmailReceipt.clientEmailsSent.length > 0 && (
                  <p>
                    Client:{" "}
                    <span className="text-foreground">
                      {lastEmailReceipt.clientEmailsSent.join(", ")}
                    </span>
                  </p>
                )}
                {lastEmailReceipt.hostEmailsSent.length > 0 && (
                  <p>
                    Host:{" "}
                    <span className="text-foreground">
                      {lastEmailReceipt.hostEmailsSent.join(", ")}
                    </span>
                  </p>
                )}
                {lastEmailReceipt.failedRecipients.length > 0 && (
                  <p className="text-amber-500">
                    Failed: {lastEmailReceipt.failedRecipients.join(", ")}
                  </p>
                )}
              </div>
              {lastEmailReceipt.meetingLink && (
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
                  <a
                    href={lastEmailReceipt.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline truncate"
                  >
                    {lastEmailReceipt.meetingLink}
                  </a>
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(
                        lastEmailReceipt.meetingLink
                      );
                      setCopiedMeetLink(true);
                      setTimeout(() => setCopiedMeetLink(false), 1800);
                    }}
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground shrink-0"
                  >
                    {copiedMeetLink ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-500" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copy Link
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </form>

        {/* Upcoming Agenda */}
        <div
          className={`${
            variant === "full" ? "lg:col-span-7" : ""
          } card-glass p-5 sm:p-6 space-y-4`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-heading text-lg font-bold text-foreground">
                Upcoming Agenda
              </h3>
              <p className="text-xs text-muted-foreground tabular-nums">
                {events.length} event{events.length === 1 ? "" : "s"} in view
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: "today", label: "Today" },
                  { id: "7d", label: "7 Days" },
                  { id: "30d", label: "30 Days" },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setRangePreset(item.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                    rangePreset === item.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary/60 text-muted-foreground border-border hover:text-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events by title, attendee, or notes…"
              className="pl-9 bg-secondary/60 border-border h-9 text-sm"
            />
          </div>

          {loadingEvents ? (
            <div className="py-12 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Loading calendar events…
            </div>
          ) : events.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-border rounded-lg">
              <CalendarIcon className="h-7 w-7 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">
                No events in this window
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Schedule a session on the left or expand your date range.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className="p-4 rounded-lg border border-border bg-secondary/35 hover:bg-secondary/55 transition-colors space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="font-heading text-sm font-semibold text-foreground truncate">
                        {ev.summary || "Untitled event"}
                      </h4>
                      <p className="text-xs text-primary font-medium flex items-center gap-1.5 mt-1 tabular-nums">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        {formatEventWindow(ev)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {ev.htmlLink && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          asChild
                        >
                          <a
                            href={ev.htmlLink}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Open in Google Calendar"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                      {canWriteCalendar && (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => startEditingEvent(ev)}
                            aria-label="Edit event"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleRequestDelete(ev)}
                            aria-label="Delete event"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {(ev.location || ev.hangoutLink || (ev.attendees && ev.attendees.length > 0)) && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                      {ev.hangoutLink && (
                        <a
                          href={ev.hangoutLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <Video className="h-3.5 w-3.5" /> Join Google Meet
                        </a>
                      )}
                      {ev.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" /> {ev.location}
                        </span>
                      )}
                      {ev.attendees && ev.attendees.length > 0 && (
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <Users className="h-3.5 w-3.5" />
                          {ev.attendees.map((a) => a.email).join(", ")}
                        </span>
                      )}
                    </div>
                  )}

                  {ev.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 pt-0.5">
                      {ev.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Explicit Confirmation Dialog before ANY create, update, or delete */}
      <AlertDialog
        open={!!pendingMutation}
        onOpenChange={(open) => {
          if (!open && !executingMutation) setPendingMutation(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingMutation?.type === "create"
                ? "Confirm New Calendar Event"
                : pendingMutation?.type === "update"
                ? "Confirm Calendar Event Update"
                : "Delete Calendar Event?"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground pt-1">
                {pendingMutation?.type === "delete" ? (
                  <>
                    <p>
                      Are you sure you want to permanently delete{" "}
                      <span className="font-semibold text-foreground">
                        {pendingMutation.event.summary || "Untitled event"}
                      </span>{" "}
                      from{" "}
                      <span className="font-semibold text-foreground">
                        {pendingMutation.calendarSummary}
                      </span>
                      ? This action cannot be undone.
                    </p>
                    <p className="text-xs tabular-nums">
                      Scheduled: {formatEventWindow(pendingMutation.event)}
                    </p>
                  </>
                ) : pendingMutation ? (
                  <div className="space-y-2">
                    <p>
                      {pendingMutation.type === "create"
                        ? "You are about to add the following event to "
                        : "You are about to update "}
                      <span className="font-semibold text-foreground">
                        {pendingMutation.calendarSummary}
                      </span>
                      :
                    </p>
                    <div className="rounded-md border border-border bg-secondary/50 p-3 space-y-1 text-xs">
                      <p className="font-semibold text-foreground text-sm">
                        {pendingMutation.payload.summary}
                      </p>
                      <p className="tabular-nums">
                        Time: {pendingMutation.displayWindow}
                      </p>
                      {pendingMutation.payload.attendeeEmails &&
                        pendingMutation.payload.attendeeEmails.length > 0 && (
                          <p>
                            Attendees:{" "}
                            {pendingMutation.payload.attendeeEmails.join(", ")}
                          </p>
                        )}
                      {pendingMutation.payload.addGoogleMeet && (
                        <p>Includes a Google Meet video link</p>
                      )}
                      {pendingMutation.sendEmails && (
                        <p>
                          Transactional emails with meeting link will be sent to{" "}
                          <span className="text-foreground font-medium">
                            {[
                              ...(pendingMutation.payload.attendeeEmails ?? []),
                              user?.email || OWNER_HOST_EMAIL,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={executingMutation}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                executeConfirmedMutation();
              }}
              disabled={executingMutation}
              className={
                pendingMutation?.type === "delete"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              {executingMutation ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  Saving…
                </>
              ) : pendingMutation?.type === "delete" ? (
                "Delete Event"
              ) : pendingMutation?.type === "update" ? (
                "Confirm Update"
              ) : (
                "Confirm & Schedule"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GoogleCalendarWorkspace;
