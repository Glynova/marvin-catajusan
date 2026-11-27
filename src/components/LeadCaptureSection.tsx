import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Code2,
  Globe,
  Loader2,
  Video,
  Workflow,
  BarChart3,
  ShieldCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import GoogleCalendarWorkspace, {
  PrefillLeadData,
} from "@/components/GoogleCalendarWorkspace";
import { PrivacyPolicyModal } from "@/components/PrivacyPolicyModal";
import {
  addMinutesToTimeStr,
  CallFormat,
  encodeLeadMessage,
  formatBookingDateLabel,
  formatTime12h,
  getEarliestAvailableBooking,
  isBookingDateAvailable,
  isBookingSlotEligible,
} from "@/lib/leadBooking";

const SCOPE_OPTIONS = [
  "Full-Stack Web App",
  "Business Ops / CRM / ERP",
  "Paid Media Funnels",
  "End-to-End Stack",
];

const TIME_SLOTS = [
  "09:00",
  "10:00",
  "11:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
];

const CALL_FORMATS: CallFormat[] = ["Google Meet", "Phone Call", "WhatsApp"];

const COMMON_TIMEZONES = [
  "Asia/Manila",
  "Asia/Singapore",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Australia/Sydney",
  "UTC",
];

const benefits = [
  { icon: Code2, text: "Architecture & stack review for your web app or portal" },
  { icon: Workflow, text: "CRM, ERP & webhook automation blueprint to cut manual ops" },
  { icon: BarChart3, text: "Paid media tracking & ROAS scaling roadmap" },
];

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getInitialBookingDate(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}

function buildFallbackInsight(
  name: string,
  scope: string,
  business: string,
  bookingSummary: string
) {
  const target = business ? `for **${business}**` : "for your team";
  return `Thanks, **${name}**! We logged your **${scope}** brief ${target} along with your requested slot (**${bookingSummary}**). During our audit we will map how your frontend, internal CRM/ops workflows, and acquisition tracking connect cleanly without data leaks.`;
}

const LeadCaptureSection = () => {
  const detectedTz = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Manila",
    []
  );
  const timezoneOptions = useMemo(() => {
    const set = new Set([detectedTz, ...COMMON_TIMEZONES]);
    return Array.from(set);
  }, [detectedTz]);

  const initialBooking = useMemo(
    () => getEarliestAvailableBooking(TIME_SLOTS, detectedTz),
    [detectedTz]
  );

  const [selectedDate, setSelectedDate] = useState<Date>(
    () => initialBooking.date
  );
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>(
    () => initialBooking.slot
  );
  const [timezone, setTimezone] = useState<string>(detectedTz);
  const [callFormat, setCallFormat] = useState<CallFormat>("Google Meet");
  const [selectedScope, setSelectedScope] = useState<string>(SCOPE_OPTIONS[0]);

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showGoogleSync, setShowGoogleSync] = useState(false);
  const [lastLead, setLastLead] = useState<PrefillLeadData | null>(null);
  const [confirmedDetails, setConfirmedDetails] = useState<{
    name: string;
    email: string;
    scope: string;
    dateLabel: string;
    timeLabel: string;
    timezone: string;
    callFormat: CallFormat;
  } | null>(null);
  const [aiResponse, setAiResponse] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(true);
  const { toast } = useToast();

  const bookingDateStr = toDateStr(selectedDate);
  const bookingDateLabel = formatBookingDateLabel(bookingDateStr);
  const bookingTimeLabel = formatTime12h(selectedTimeSlot);

  // Keep selected date and slot valid under the strict 24-hour buffer when timezone or date changes
  useEffect(() => {
    if (!isBookingDateAvailable(bookingDateStr, TIME_SLOTS, timezone)) {
      const nextValid = getEarliestAvailableBooking(TIME_SLOTS, timezone);
      setSelectedDate(nextValid.date);
      setSelectedTimeSlot(nextValid.slot);
      return;
    }

    if (!isBookingSlotEligible(bookingDateStr, selectedTimeSlot, timezone)) {
      const firstValidSlot = TIME_SLOTS.find((slot) =>
        isBookingSlotEligible(bookingDateStr, slot, timezone)
      );
      if (firstValidSlot) {
        setSelectedTimeSlot(firstValidSlot);
      }
    }
  }, [bookingDateStr, selectedTimeSlot, timezone]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (
      !selectedDate ||
      !selectedTimeSlot ||
      !isBookingSlotEligible(bookingDateStr, selectedTimeSlot, timezone)
    ) {
      toast({
        title: "24-hour advance notice required",
        description:
          "Same-day bookings are unavailable. Please choose a slot at least 24 hours from now.",
        variant: "destructive",
      });
      return;
    }

    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = (formData.get("name") as string).trim();
    const email = (formData.get("email") as string).trim();
    const phone = ((formData.get("phone") as string) || "").trim();
    const business = ((formData.get("business") as string) || "").trim();
    const challenge = ((formData.get("challenge") as string) || "").trim();
    const budget = ((formData.get("budget") as string) || "").trim();

    const encodedMessage = encodeLeadMessage({
      scope: selectedScope,
      bookingDate: bookingDateStr,
      bookingTime: selectedTimeSlot,
      durationMinutes: 45,
      timezone,
      callFormat,
      notes: challenge,
    });

    setSubmitting(true);

    const { error: insertError } = await supabase.from("leads").insert({
      name,
      email,
      phone,
      business_name: business,
      message: encodedMessage,
      budget,
      status: "New",
    });

    setSubmitting(false);

    if (insertError) {
      toast({
        title: "Submission failed",
        description: "Could not save your booking brief. Please try again.",
        variant: "destructive",
      });
      return;
    }

    const endTime = addMinutesToTimeStr(selectedTimeSlot, 45);
    setLastLead({
      name,
      email,
      business,
      scope: selectedScope,
      budget,
      phone,
      message: challenge,
      dateStr: bookingDateStr,
      startTime: selectedTimeSlot,
      endTime,
      location:
        callFormat === "Google Meet"
          ? "Google Meet"
          : `${callFormat}${phone ? ` (${phone})` : ""}`,
      addGoogleMeet: callFormat === "Google Meet",
    });
    setConfirmedDetails({
      name,
      email,
      scope: selectedScope,
      dateLabel: bookingDateLabel,
      timeLabel: bookingTimeLabel,
      timezone,
      callFormat,
    });

    setSubmitted(true);
    setShowGoogleSync(false);
    setLoadingAi(true);
    toast({
      title: "Booking & inquiry synced",
      description: `${bookingDateLabel} at ${bookingTimeLabel} (${callFormat}) saved to lead pipeline.`,
    });

    const bookingSummary = `${bookingDateLabel} · ${bookingTimeLabel} (${timezone}) via ${callFormat}`;

    try {
      const { data, error } = await supabase.functions.invoke("lead-response", {
        body: {
          name,
          business,
          challenge: `[Scope: ${selectedScope}] [Requested Slot: ${bookingSummary}] ${challenge}`,
        },
      });

      if (error || !data?.response) {
        setAiResponse(
          buildFallbackInsight(name, selectedScope, business, bookingSummary)
        );
      } else {
        setAiResponse(data.response);
      }
    } catch {
      setAiResponse(
        buildFallbackInsight(name, selectedScope, business, bookingSummary)
      );
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <section
      id="contact"
      className="section-padding border-t border-border relative overflow-hidden"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: "var(--gradient-hero)" }}
      />
      <div className="section-container relative z-10 space-y-10">
        {/* Top Intro & Benefits Row */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="grid lg:grid-cols-12 gap-8 items-end"
        >
          <div className="lg:col-span-6">
            <p className="text-xs font-medium text-primary uppercase tracking-widest mb-3">
              Start a Project
            </p>
            <h2 className="font-heading text-3xl lg:text-4xl font-bold mb-3">
              Book a Technical &amp;{" "}
              <span className="gradient-text">Growth Audit</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed max-w-xl">
              Pick a preferred date and time slot right alongside your project brief. Every detail syncs automatically so we arrive prepared with concrete architecture and acquisition recommendations.
            </p>
          </div>

          <div className="lg:col-span-6 space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              {benefits.map((b) => (
                <div key={b.text} className="flex items-start gap-2.5">
                  <b.icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-xs text-muted-foreground leading-relaxed">
                    {b.text}
                  </span>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs font-medium text-muted-foreground">
              <span>Direct response within 24 hours · Limited monthly build slots</span>
              <Link
                to="/calendar"
                className="inline-flex items-center gap-1.5 text-primary hover:underline"
              >
                <CalendarDays className="h-3.5 w-3.5" /> Open Full Calendar Workspace
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Main Unified Side-by-Side Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        >
          {submitted && confirmedDetails ? (
            <div className="card-glass p-6 md:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-7 w-7 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-heading text-xl font-bold text-foreground">
                      Booking Request &amp; Brief Synced
                    </h3>
                    <p className="text-xs font-medium text-muted-foreground mt-1 tabular-nums">
                      {confirmedDetails.scope} · {confirmedDetails.dateLabel} at{" "}
                      {confirmedDetails.timeLabel} ({confirmedDetails.timezone}) ·{" "}
                      {confirmedDetails.callFormat}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <Button
                    type="button"
                    variant="hero"
                    size="sm"
                    onClick={() => setShowGoogleSync((prev) => !prev)}
                    className="gap-1.5 whitespace-nowrap"
                  >
                    <CalendarDays className="h-4 w-4" />
                    {showGoogleSync
                      ? "Hide Google Calendar Sync"
                      : "Confirm on Google Calendar & Email Link"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSubmitted(false);
                      setAiResponse("");
                      setShowGoogleSync(false);
                    }}
                    className="whitespace-nowrap"
                  >
                    Book Another Slot
                  </Button>
                </div>
              </div>

              {loadingAi ? (
                <div className="flex items-center gap-2 text-muted-foreground py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm">
                    Generating tailored architecture notes…
                  </span>
                </div>
              ) : (
                <div className="bg-secondary/45 border border-border rounded-lg p-5">
                  <p className="text-xs font-medium uppercase tracking-wider text-primary mb-2">
                    Initial Assessment
                  </p>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 leading-relaxed [&>p]:mb-2 [&>p:last-child]:mb-0">
                    <ReactMarkdown>{aiResponse}</ReactMarkdown>
                  </div>
                </div>
              )}

              {showGoogleSync && lastLead && (
                <div className="pt-2 border-t border-border">
                  <GoogleCalendarWorkspace
                    variant="compact"
                    prefillLead={lastLead}
                    enforceOneDayBuffer
                  />
                </div>
              )}
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="card-glass overflow-hidden grid lg:grid-cols-12"
            >
              {/* Left Pane: Interactive Booking Calendar & Slot Picker */}
              <div className="lg:col-span-5 p-6 md:p-8 border-b lg:border-b-0 lg:border-r border-border space-y-5 bg-secondary/20">
                <div>
                  <h3 className="font-heading text-lg font-bold text-foreground">
                    1. Choose Date &amp; Time
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                    45-minute Technical &amp; Growth Audit
                  </p>
                  <p className="text-xs text-primary/90 mt-1">
                    Same-day booking unavailable · Minimum 24-hour advance notice required
                  </p>
                </div>

                <div className="border border-border rounded-lg bg-background/60 p-2 flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    disabled={(date) =>
                      !isBookingDateAvailable(toDateStr(date), TIME_SLOTS, timezone)
                    }
                    className="p-1"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-muted-foreground inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-primary" /> Available Slots
                    </span>
                    <span className="text-foreground font-medium tabular-nums">
                      {bookingDateLabel}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {TIME_SLOTS.map((slot) => {
                      const active = selectedTimeSlot === slot;
                      const eligible = isBookingSlotEligible(
                        bookingDateStr,
                        slot,
                        timezone
                      );
                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={!eligible}
                          onClick={() => eligible && setSelectedTimeSlot(slot)}
                          className={`px-2 py-2 text-xs font-medium rounded-md border transition-colors whitespace-nowrap tabular-nums ${
                            !eligible
                              ? "bg-secondary/25 text-muted-foreground/45 border-border/50 cursor-not-allowed line-through"
                              : active
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-secondary/60 text-muted-foreground border-border hover:text-foreground"
                          }`}
                        >
                          {formatTime12h(slot)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-1 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-primary" /> Timezone
                    </label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger className="h-9 text-xs bg-secondary/60 border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timezoneOptions.map((tz) => (
                          <SelectItem key={tz} value={tz}>
                            {tz}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1.5">
                      <Video className="h-3.5 w-3.5 text-primary" /> Call Format
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {CALL_FORMATS.map((fmt) => {
                        const active = callFormat === fmt;
                        return (
                          <button
                            key={fmt}
                            type="button"
                            onClick={() => setCallFormat(fmt)}
                            className={`px-2.5 py-2 text-xs font-medium rounded-md border transition-colors whitespace-nowrap ${
                              active
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-secondary/60 text-muted-foreground border-border hover:text-foreground"
                            }`}
                          >
                            {fmt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-border text-xs text-muted-foreground tabular-nums">
                  Selected:{" "}
                  <span className="text-foreground font-medium">
                    {bookingDateLabel} · {bookingTimeLabel}
                  </span>{" "}
                  ({timezone}) · {callFormat}
                </div>
              </div>

              {/* Right Pane: Project Brief Form */}
              <div className="lg:col-span-7 p-6 md:p-8 space-y-5 flex flex-col justify-between">
                <div className="space-y-5">
                  <div>
                    <h3 className="font-heading text-lg font-bold text-foreground">
                      2. Project &amp; System Details
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      All contact, scope, and booking details sync directly into our lead pipeline.
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Primary Focus
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {SCOPE_OPTIONS.map((scope) => {
                        const active = selectedScope === scope;
                        return (
                          <button
                            key={scope}
                            type="button"
                            onClick={() => setSelectedScope(scope)}
                            className={`px-3 py-2 text-xs font-medium rounded-md border text-left transition-colors ${
                              active
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-secondary/60 text-muted-foreground border-border hover:text-foreground"
                            }`}
                          >
                            {scope}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <Input
                      name="name"
                      placeholder="Your Name *"
                      required
                      className="bg-secondary/60 border-border"
                    />
                    <Input
                      name="email"
                      placeholder="Email Address *"
                      type="email"
                      required
                      className="bg-secondary/60 border-border"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <Input
                      name="business"
                      placeholder="Company / Project Name"
                      className="bg-secondary/60 border-border"
                    />
                    <Input
                      name="budget"
                      placeholder="Estimated Budget or Monthly Spend"
                      className="bg-secondary/60 border-border"
                    />
                  </div>

                  <Input
                    name="phone"
                    placeholder={
                      callFormat === "Google Meet"
                        ? "Phone / WhatsApp (optional)"
                        : `${callFormat} Number *`
                    }
                    required={callFormat !== "Google Meet"}
                    className="bg-secondary/60 border-border"
                  />

                  <Textarea
                    name="challenge"
                    placeholder="What are you building, automating, or scaling right now?"
                    rows={4}
                    required
                    className="bg-secondary/60 border-border"
                  />

                  <div className="flex items-center gap-2.5 pt-1">
                    <input
                      type="checkbox"
                      id="privacy-consent"
                      checked={privacyAccepted}
                      onChange={(e) => setPrivacyAccepted(e.target.checked)}
                      required
                      className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                    />
                    <label htmlFor="privacy-consent" className="text-xs text-muted-foreground select-none">
                      I agree to data privacy and secure confidential data handling policies.{" "}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setPrivacyModalOpen(true);
                        }}
                        className="text-primary underline hover:text-primary/80 font-medium inline-flex items-center gap-1"
                      >
                        Learn more
                      </button>
                    </label>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2">
                  <Button
                    variant="hero"
                    size="lg"
                    className="w-full whitespace-nowrap"
                    type="submit"
                    disabled={submitting || !privacyAccepted}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Syncing Booking &amp; Brief…
                      </>
                    ) : (
                      <>
                        Confirm Booking &amp; Send Brief{" "}
                        <ArrowRight className="ml-1.5 h-4 w-4" />
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center tabular-nums">
                    Booking {bookingDateLabel} at {bookingTimeLabel} · Direct feedback within 24 hours
                  </p>
                </div>
              </div>
            </form>
          )}
        </motion.div>
      </div>
      <PrivacyPolicyModal isOpen={privacyModalOpen} onClose={() => setPrivacyModalOpen(false)} />
    </section>
  );
};

export default LeadCaptureSection;
