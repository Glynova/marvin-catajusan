import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ArrowUpDown,
  CalendarCheck2,
  CalendarDays,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Globe,
  Mail,
  Phone,
  Plus,
  Search,
  Video,
} from "lucide-react";
import AdminNavbar from "@/components/AdminNavbar";
import GoogleCalendarWorkspace from "@/components/GoogleCalendarWorkspace";
import { CalendarEvent } from "@/lib/googleCalendarApi";
import { DualEmailDeliveryReceipt } from "@/lib/gmailBookingMailer";
import {
  addMinutesToTimeStr,
  CallFormat,
  decodeLeadMessage,
  encodeLeadMessage,
  formatBookingDateLabel,
  formatTime12h,
} from "@/lib/leadBooking";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  business_name: string | null;
  budget: string | null;
  status: string;
  submitted_at: string;
}

const statuses = ["New", "Contacted", "Qualified", "Closed", "Lost"];
const scopeOptions = [
  "Full-Stack Web App",
  "Business Ops / CRM / ERP",
  "Paid Media Funnels",
  "End-to-End Stack",
];

const AdminLeads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [sortAsc, setSortAsc] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addScope, setAddScope] = useState(scopeOptions[0]);
  const [addCallFormat, setAddCallFormat] = useState<CallFormat>("Google Meet");

  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [showCalendarSyncInDrawer, setShowCalendarSyncInDrawer] = useState(false);
  const [copiedLeadId, setCopiedLeadId] = useState<string | null>(null);

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      const isAdmin = await checkAuth();
      if (isAdmin) {
        setAuthed(true);
        await fetchLeads();
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!authed) return;
    const channel = supabase
      .channel("leads-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "leads" },
        (payload) => {
          const newLead = payload.new as Lead;
          setLeads((prev) => [newLead, ...prev]);
          toast({
            title: "New Lead Received",
            description: `${newLead.name} submitted a brief.`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authed]);

  const checkAuth = async (): Promise<boolean> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      navigate("/admin-portal");
      return false;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      await supabase.auth.signOut();
      navigate("/admin-portal");
      return false;
    }
    return true;
  };

  const fetchLeads = async () => {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("submitted_at", { ascending: false });

    if (!error && data) setLeads(data as Lead[]);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("leads").update({ status }).eq("id", id);
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    setActiveLead((prev) => (prev && prev.id === id ? { ...prev, status } : prev));
    toast({
      title: "Status updated",
      description: `Lead marked as ${status}.`,
    });
  };

  const markLeadCalendarSynced = async (
    lead: Lead,
    event?: CalendarEvent,
    receipt?: DualEmailDeliveryReceipt
  ) => {
    const decoded = decodeLeadMessage(lead.message);
    const meetingLink =
      receipt?.meetingLink || event?.hangoutLink || event?.htmlLink || decoded.meetingLink;
    const confirmationEmailsSent =
      Boolean(receipt && (receipt.clientEmailsSent.length > 0 || receipt.hostEmailsSent.length > 0)) ||
      decoded.confirmationEmailsSent;

    const updatedMessage = encodeLeadMessage({
      ...decoded,
      calendarSynced: true,
      meetingLink,
      confirmationEmailsSent,
    });

    const nextStatus = lead.status === "New" ? "Contacted" : lead.status;
    await supabase
      .from("leads")
      .update({ message: updatedMessage, status: nextStatus })
      .eq("id", lead.id);

    setLeads((prev) =>
      prev.map((l) =>
        l.id === lead.id ? { ...l, message: updatedMessage, status: nextStatus } : l
      )
    );
    setActiveLead((prev) =>
      prev && prev.id === lead.id
        ? { ...prev, message: updatedMessage, status: nextStatus }
        : prev
    );
  };

  const handleAddLead = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAddLoading(true);
    const fd = new FormData(e.currentTarget);
    const rawDate = ((fd.get("bookingDate") as string) || "").trim();
    const rawTime = ((fd.get("bookingTime") as string) || "").trim();
    const rawNotes = ((fd.get("message") as string) || "").trim();

    const encodedMessage = encodeLeadMessage({
      scope: addScope,
      bookingDate: rawDate || undefined,
      bookingTime: rawTime || undefined,
      durationMinutes: 45,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Manila",
      callFormat: addCallFormat,
      notes: rawNotes,
    });

    const newLead = {
      name: fd.get("name") as string,
      email: fd.get("email") as string,
      phone: (fd.get("phone") as string) || "",
      business_name: (fd.get("business_name") as string) || "",
      message: encodedMessage,
      budget: (fd.get("budget") as string) || "",
      status: "New",
    };

    const { data, error } = await supabase
      .from("leads")
      .insert(newLead)
      .select()
      .single();

    setAddLoading(false);
    if (error) {
      toast({
        title: "Error",
        description: "Failed to add lead.",
        variant: "destructive",
      });
    } else {
      if (data) {
        setLeads((prev) => {
          const exists = prev.some((l) => l.id === data.id);
          return exists ? prev : [data as Lead, ...prev];
        });
      }
      toast({
        title: "Lead added",
        description: `${newLead.name} has been added to your pipeline.`,
      });
      setAddOpen(false);
    }
  };

  const handleCopySummary = async (lead: Lead) => {
    const parsed = decodeLeadMessage(lead.message);
    const lines = [
      `Name: ${lead.name}`,
      `Email: ${lead.email}`,
      lead.phone ? `Phone: ${lead.phone}` : null,
      lead.business_name ? `Company: ${lead.business_name}` : null,
      parsed.scope ? `Scope: ${parsed.scope}` : null,
      lead.budget ? `Budget: ${lead.budget}` : null,
      parsed.bookingDate
        ? `Requested Slot: ${formatBookingDateLabel(parsed.bookingDate)} ${
            parsed.bookingTime ? formatTime12h(parsed.bookingTime) : ""
          } (${parsed.timezone || "Local"}) · ${parsed.callFormat || "Google Meet"}`
        : null,
      `Notes: ${parsed.notes || "—"}`,
    ].filter(Boolean);

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopiedLeadId(lead.id);
      setTimeout(() => setCopiedLeadId(null), 1800);
      toast({ title: "Lead details copied" });
    } catch {
      toast({
        title: "Copy failed",
        description: "Clipboard access was blocked by the browser.",
        variant: "destructive",
      });
    }
  };

  const summaryCounts = useMemo(() => {
    let withSlot = 0;
    let newCount = 0;
    let qualifiedCount = 0;
    for (const l of leads) {
      if (l.status === "New") newCount++;
      if (l.status === "Qualified") qualifiedCount++;
      if (decodeLeadMessage(l.message).bookingDate) withSlot++;
    }
    return { total: leads.length, newCount, qualifiedCount, withSlot };
  }, [leads]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads
      .filter((l) => {
        if (statusFilter !== "All" && l.status !== statusFilter) return false;
        if (!q) return true;
        return (
          l.name.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          (l.business_name || "").toLowerCase().includes(q) ||
          (l.message || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) =>
        sortAsc
          ? new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
          : new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
      );
  }, [leads, search, statusFilter, sortAsc]);

  const activeParsed = useMemo(
    () => (activeLead ? decodeLeadMessage(activeLead.message) : null),
    [activeLead]
  );

  return (
    <div className="min-h-screen bg-background">
      <AdminNavbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              Lead Management
            </h1>
            <p className="text-xs text-muted-foreground mt-1 tabular-nums">
              {summaryCounts.total} Total · {summaryCounts.newCount} New ·{" "}
              {summaryCounts.qualifiedCount} Qualified · {summaryCounts.withSlot} With Requested Booking Slot — Click any row to inspect &amp; sync
            </p>
          </div>

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button variant="default" size="sm" className="gap-1.5 shrink-0">
                <Plus className="h-4 w-4" /> Add Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Lead Manually</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddLead} className="space-y-3 mt-2">
                <Input
                  name="name"
                  placeholder="Full Name *"
                  required
                  className="bg-secondary border-border"
                />
                <Input
                  name="email"
                  placeholder="Email Address *"
                  type="email"
                  required
                  className="bg-secondary border-border"
                />
                <div className="grid grid-cols-2 gap-2.5">
                  <Input
                    name="phone"
                    placeholder="Phone (optional)"
                    className="bg-secondary border-border"
                  />
                  <Input
                    name="budget"
                    placeholder="Budget Range"
                    className="bg-secondary border-border"
                  />
                </div>
                <Input
                  name="business_name"
                  placeholder="Company / Business Name"
                  className="bg-secondary border-border"
                />
                <div className="grid grid-cols-2 gap-2.5">
                  <Select value={addScope} onValueChange={setAddScope}>
                    <SelectTrigger className="bg-secondary border-border text-xs">
                      <SelectValue placeholder="Primary Scope" />
                    </SelectTrigger>
                    <SelectContent>
                      {scopeOptions.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={addCallFormat}
                    onValueChange={(v) => setAddCallFormat(v as CallFormat)}
                  >
                    <SelectTrigger className="bg-secondary border-border text-xs">
                      <SelectValue placeholder="Call Format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Google Meet">Google Meet</SelectItem>
                      <SelectItem value="Phone Call">Phone Call</SelectItem>
                      <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <Input
                    name="bookingDate"
                    type="date"
                    className="bg-secondary border-border tabular-nums text-xs"
                  />
                  <Input
                    name="bookingTime"
                    type="time"
                    className="bg-secondary border-border tabular-nums text-xs"
                  />
                </div>
                <Textarea
                  name="message"
                  placeholder="Project notes, goals, or challenge…"
                  rows={3}
                  className="bg-secondary border-border"
                />
                <Button type="submit" className="w-full" disabled={addLoading}>
                  {addLoading ? "Saving…" : "Save Lead"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search, Status Filters & Sort */}
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, company, or notes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-secondary border-border"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {["All", ...statuses].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap ${
                  statusFilter === st
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary/60 text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                {st}
              </button>
            ))}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortAsc(!sortAsc)}
              className="gap-1.5 shrink-0 ml-auto lg:ml-1"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              {sortAsc ? "Oldest first" : "Newest first"}
            </Button>
          </div>
        </div>

        {/* Leads Table */}
        <div className="card-glass overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead className="hidden md:table-cell">Company</TableHead>
                  <TableHead className="hidden lg:table-cell">Scope</TableHead>
                  <TableHead>Requested Slot</TableHead>
                  <TableHead className="hidden md:table-cell">Budget</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">
                    Submitted
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-12 text-muted-foreground"
                    >
                      Loading leads…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-12 text-muted-foreground"
                    >
                      No leads match your current filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((lead) => {
                    const parsed = decodeLeadMessage(lead.message);
                    const isSelected = activeLead?.id === lead.id;

                    return (
                      <TableRow
                        key={lead.id}
                        tabIndex={0}
                        onClick={() => {
                          setActiveLead(lead);
                          setShowCalendarSyncInDrawer(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setActiveLead(lead);
                            setShowCalendarSyncInDrawer(false);
                          }
                        }}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? "bg-primary/10" : "hover:bg-secondary/50"
                        }`}
                      >
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {lead.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {lead.email}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {lead.business_name || "—"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-foreground">
                          {parsed.scope || "General Inquiry"}
                        </TableCell>
                        <TableCell className="text-xs tabular-nums">
                          {parsed.bookingDate ? (
                            <div>
                              <span className="font-medium text-foreground">
                                {formatBookingDateLabel(parsed.bookingDate)}
                              </span>
                              <div className="text-muted-foreground">
                                {parsed.bookingTime
                                  ? formatTime12h(parsed.bookingTime)
                                  : "Time TBD"}
                                {parsed.callFormat ? ` · ${parsed.callFormat}` : ""}
                                {parsed.calendarSynced ? " · Synced" : ""}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm tabular-nums text-muted-foreground">
                          {lead.budget || "—"}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={lead.status}
                            onValueChange={(v) => updateStatus(lead.id, v)}
                          >
                            <SelectTrigger className="w-[120px] h-8 text-xs bg-secondary border-border">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statuses.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-right text-xs text-muted-foreground tabular-nums">
                          {new Date(lead.submitted_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>

      {/* Slide-Over Detail Drawer */}
      <Sheet
        open={!!activeLead}
        onOpenChange={(open) => {
          if (!open) {
            setActiveLead(null);
            setShowCalendarSyncInDrawer(false);
          }
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl overflow-y-auto flex flex-col gap-6"
        >
          {activeLead && activeParsed && (
            <>
              <SheetHeader className="border-b border-border pb-4 text-left">
                <div className="flex flex-wrap items-start justify-between gap-3 pr-6">
                  <div>
                    <SheetTitle className="font-heading text-xl font-bold text-foreground">
                      {activeLead.name}
                    </SheetTitle>
                    <SheetDescription className="text-xs text-muted-foreground mt-1 tabular-nums">
                      {activeLead.business_name
                        ? `${activeLead.business_name} · `
                        : ""}
                      Submitted{" "}
                      {new Date(activeLead.submitted_at).toLocaleString()}
                    </SheetDescription>
                  </div>

                  <Select
                    value={activeLead.status}
                    onValueChange={(v) => updateStatus(activeLead.id, v)}
                  >
                    <SelectTrigger className="w-[130px] h-8 text-xs bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </SheetHeader>

              {/* Contact Links */}
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <a
                  href={`mailto:${activeLead.email}`}
                  className="inline-flex items-center gap-1.5 text-primary hover:underline"
                >
                  <Mail className="h-3.5 w-3.5" /> {activeLead.email}
                </a>
                {activeLead.phone && (
                  <a
                    href={`tel:${activeLead.phone}`}
                    className="inline-flex items-center gap-1.5 text-foreground hover:text-primary"
                  >
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />{" "}
                    {activeLead.phone}
                  </a>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopySummary(activeLead)}
                  className="h-7 px-2 text-xs gap-1 ml-auto"
                >
                  {copiedLeadId === activeLead.id ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copy Summary
                    </>
                  )}
                </Button>
              </div>

              {/* Requested Booking Slot */}
              <div className="border-t border-border pt-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-heading text-sm font-semibold text-foreground">
                    Requested Audit Slot
                  </h4>
                  {activeParsed.calendarSynced && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-500">
                      <CalendarCheck2 className="h-3.5 w-3.5" /> Synced to Google Calendar
                    </span>
                  )}
                </div>

                {activeParsed.bookingDate ? (
                  <div className="rounded-lg border border-border bg-secondary/35 p-4 space-y-3 text-xs tabular-nums">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 text-foreground font-medium">
                        <CalendarDays className="h-4 w-4 text-primary shrink-0" />
                        {formatBookingDateLabel(activeParsed.bookingDate)}
                      </div>
                      <div className="flex items-center gap-2 text-foreground font-medium">
                        <Clock className="h-4 w-4 text-primary shrink-0" />
                        {activeParsed.bookingTime
                          ? `${formatTime12h(activeParsed.bookingTime)} – ${formatTime12h(
                              addMinutesToTimeStr(
                                activeParsed.bookingTime,
                                activeParsed.durationMinutes ?? 45
                              )
                            )}`
                          : "Time not specified"}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                        {activeParsed.timezone || "Local timezone"}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Video className="h-4 w-4 text-muted-foreground shrink-0" />
                        {activeParsed.callFormat || "Google Meet"}
                      </div>
                    </div>

                    {(activeParsed.meetingLink || activeParsed.confirmationEmailsSent) && (
                      <div className="pt-2.5 border-t border-border flex flex-wrap items-center justify-between gap-2">
                        {activeParsed.meetingLink && (
                          <a
                            href={activeParsed.meetingLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-primary hover:underline font-medium"
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> Open Meeting Link
                          </a>
                        )}
                        {activeParsed.confirmationEmailsSent && (
                          <span className="text-emerald-500 font-medium inline-flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" /> Emails sent to both sides
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No preferred date or time slot was requested with this inquiry.
                  </p>
                )}
              </div>

              {/* Full Inquiry Brief */}
              <div className="border-t border-border pt-4 space-y-3">
                <h4 className="font-heading text-sm font-semibold text-foreground">
                  Inquiry Brief
                </h4>
                <div className="text-xs text-muted-foreground tabular-nums">
                  Scope:{" "}
                  <span className="text-foreground font-medium">
                    {activeParsed.scope || "General Inquiry"}
                  </span>{" "}
                  · Budget:{" "}
                  <span className="text-foreground font-medium">
                    {activeLead.budget || "Not specified"}
                  </span>
                </div>
                <div className="rounded-lg border border-border bg-secondary/35 p-4 text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {activeParsed.notes || "No written project notes provided."}
                </div>
              </div>

              {/* Google Calendar Sync */}
              <div className="border-t border-border pt-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-heading text-sm font-semibold text-foreground">
                      Google Calendar Sync
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Pre-filled with this lead&apos;s requested slot, email, and project brief.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={showCalendarSyncInDrawer ? "outline" : "hero"}
                    size="sm"
                    onClick={() =>
                      setShowCalendarSyncInDrawer((prev) => !prev)
                    }
                    className="gap-1.5 shrink-0"
                  >
                    <CalendarDays className="h-4 w-4" />
                    {showCalendarSyncInDrawer ? "Hide Scheduler" : "Sync to Calendar"}
                  </Button>
                </div>

                {showCalendarSyncInDrawer && (
                  <GoogleCalendarWorkspace
                    variant="compact"
                    prefillLead={{
                      name: activeLead.name,
                      email: activeLead.email,
                      business: activeLead.business_name || undefined,
                      scope: activeParsed.scope,
                      budget: activeLead.budget || undefined,
                      phone: activeLead.phone || undefined,
                      message: activeParsed.notes || activeLead.message || undefined,
                      dateStr: activeParsed.bookingDate,
                      startTime: activeParsed.bookingTime,
                      endTime: activeParsed.bookingTime
                        ? addMinutesToTimeStr(
                            activeParsed.bookingTime,
                            activeParsed.durationMinutes ?? 45
                          )
                        : undefined,
                      location:
                        activeParsed.callFormat === "Google Meet"
                          ? "Google Meet"
                          : activeParsed.callFormat
                          ? `${activeParsed.callFormat}${
                              activeLead.phone ? ` (${activeLead.phone})` : ""
                            }`
                          : undefined,
                      addGoogleMeet:
                        !activeParsed.callFormat ||
                        activeParsed.callFormat === "Google Meet",
                    }}
                    onEventCreated={(ev, receipt) =>
                      markLeadCalendarSynced(activeLead, ev, receipt)
                    }
                  />
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminLeads;
