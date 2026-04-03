import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LogOut, Search, ArrowUpDown, LayoutDashboard, Image, Plus, Share2 } from "lucide-react";
interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  business_name: string;
  budget: string;
  status: string;
  submitted_at: string;
}

const statuses = ["New", "Contacted", "Qualified", "Closed", "Lost"];

const AdminLeads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
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
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "leads" }, (payload) => {
        const newLead = payload.new as Lead;
        setLeads((prev) => [newLead, ...prev]);
        toast({ title: "🔔 New Lead!", description: `${newLead.name} just submitted a form.` });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [authed]);

  const checkAuth = async (): Promise<boolean> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/admin-portal"); return false; }

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
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin-portal");
  };

  const handleAddLead = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAddLoading(true);
    const fd = new FormData(e.currentTarget);
    const newLead = {
      name: fd.get("name") as string,
      email: fd.get("email") as string,
      phone: (fd.get("phone") as string) || "",
      business_name: (fd.get("business_name") as string) || "",
      message: (fd.get("message") as string) || "",
      budget: (fd.get("budget") as string) || "",
      status: "New",
    };
    const { error } = await supabase.from("leads").insert(newLead);
    setAddLoading(false);
    if (error) {
      toast({ title: "Error", description: "Failed to add lead.", variant: "destructive" });
    } else {
      toast({ title: "Lead added!", description: `${newLead.name} has been added.` });
      setAddOpen(false);
    }
  };

  const filtered = leads
    .filter((l) => l.name.toLowerCase().includes(search.toLowerCase()) || l.email.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sortAsc
      ? new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
      : new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
    );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/60 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="font-heading text-lg font-bold gradient-text">GLYNOVA</a>
            <span className="text-xs text-muted-foreground">Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/leads")} className="gap-1">
              <LayoutDashboard className="h-4 w-4" /> Leads
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/portfolio")} className="gap-1">
              <Image className="h-4 w-4" /> Portfolio
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/social")} className="gap-1">
              <Share2 className="h-4 w-4" /> Social
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/ads-intelligence")} className="gap-1">
              <BarChart3 className="h-4 w-4" /> Ads AI
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1">
              <LogOut className="h-4 w-4" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-heading text-2xl font-bold">Lead Management</h1>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button variant="default" size="sm" className="gap-1">
                <Plus className="h-4 w-4" /> Add Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Lead Manually</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddLead} className="space-y-3 mt-2">
                <Input name="name" placeholder="Full Name" required className="bg-secondary border-border" />
                <Input name="email" placeholder="Email Address" type="email" required className="bg-secondary border-border" />
                <Input name="phone" placeholder="Phone (optional)" className="bg-secondary border-border" />
                <Input name="business_name" placeholder="Business Name / Type" className="bg-secondary border-border" />
                <Input name="budget" placeholder="Budget Range (optional)" className="bg-secondary border-border" />
                <Textarea name="message" placeholder="Business type, notes, or challenge…" rows={3} className="bg-secondary border-border" />
                <Button type="submit" className="w-full" disabled={addLoading}>
                  {addLoading ? "Saving…" : "Save Lead"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-secondary border-border"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setSortAsc(!sortAsc)} className="gap-1 shrink-0">
            <ArrowUpDown className="h-4 w-4" /> {sortAsc ? "Oldest first" : "Newest first"}
          </Button>
        </div>

        <div className="card-glass overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="hidden md:table-cell">Phone</TableHead>
                  <TableHead className="hidden md:table-cell">Business</TableHead>
                  <TableHead className="hidden lg:table-cell">Message</TableHead>
                  <TableHead className="hidden md:table-cell">Budget</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">Loading…</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No leads found.</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.name}</TableCell>
                      <TableCell className="text-sm">{lead.email}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{lead.phone || "—"}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{lead.business_name || "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm max-w-[200px] truncate">{lead.message || "—"}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{lead.budget || "—"}</TableCell>
                      <TableCell>
                        <Select value={lead.status} onValueChange={(v) => updateStatus(lead.id, v)}>
                          <SelectTrigger className="w-[120px] h-8 text-xs bg-secondary border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statuses.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                        {new Date(lead.submitted_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminLeads;
