import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Trash2, LogOut, Users, Image, Share2, Brain, BarChart3,
  DollarSign, Target, TrendingUp, Gauge, ArrowRight,
} from "lucide-react";

interface CampaignWithMetrics {
  id: string;
  name: string;
  total_budget: number;
  created_at: string;
  totalSpend: number;
  revenue: number;
  roas: number;
  activeAds: number;
  score: number;
}

function getScoreColor(score: number): string {
  if (score <= 40) return "text-red-500";
  if (score <= 70) return "text-blue-500";
  return "text-green-500";
}

export default function AdminCampaigns() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<CampaignWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBudget, setNewBudget] = useState(0);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/admin-portal"); return; }
    const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!data) { navigate("/admin-portal"); return; }
    fetchCampaigns();
  }

  async function fetchCampaigns() {
    setLoading(true);
    const { data: camps } = await supabase.from("budget_campaigns").select("*").order("created_at", { ascending: false });
    if (!camps) { setLoading(false); return; }

    const enriched: CampaignWithMetrics[] = await Promise.all(
      camps.map(async (c) => {
        const { data: ads } = await supabase.from("budget_ads").select("*").eq("campaign_id", c.id);
        const adList = ads || [];
        const totalSpend = adList.reduce((s, a) => s + a.spend, 0);
        const revenue = adList.reduce((s, a) => s + a.revenue, 0);
        const roas = totalSpend > 0 ? revenue / totalSpend : 0;
        const avgScore = adList.length > 0 ? adList.reduce((s, a) => s + a.score, 0) / adList.length : 0;
        return {
          id: c.id, name: c.name, total_budget: c.total_budget, created_at: c.created_at,
          totalSpend, revenue, roas, activeAds: adList.length, score: avgScore,
        };
      })
    );
    setCampaigns(enriched);
    setLoading(false);
  }

  async function createCampaign() {
    if (!newName.trim()) { toast({ title: "Enter a campaign name", variant: "destructive" }); return; }
    setCreating(true);
    const { data, error } = await supabase.from("budget_campaigns").insert({
      name: newName.trim(), total_budget: newBudget, testing_pct: 30, evaluation_pct: 30, scaling_pct: 40,
    }).select().single();
    if (error || !data) { toast({ title: "Error creating campaign", variant: "destructive" }); setCreating(false); return; }
    // Create metrics row
    await supabase.from("campaign_metrics").insert({ campaign_id: data.id });
    setCreating(false);
    setShowCreate(false);
    setNewName("");
    setNewBudget(0);
    navigate(`/admin/campaign/${data.id}`);
  }

  async function deleteCampaign() {
    if (!deleteId) return;
    await supabase.from("budget_ads").delete().eq("campaign_id", deleteId);
    await supabase.from("campaign_metrics").delete().eq("campaign_id", deleteId);
    await supabase.from("budget_campaigns").delete().eq("id", deleteId);
    setDeleteId(null);
    toast({ title: "Campaign deleted" });
    fetchCampaigns();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/admin-portal");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b bg-card/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h1 className="font-heading text-lg font-bold">Campaign Manager</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/leads")}><Users className="h-4 w-4 mr-1" /> Leads</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/ads-intelligence")}><Brain className="h-4 w-4 mr-1" /> AI Ads</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/social")}><Share2 className="h-4 w-4 mr-1" /> Social</Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}><LogOut className="h-4 w-4 mr-1" /> Logout</Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">All Campaigns</h2>
            <p className="text-sm text-muted-foreground">{campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}</p>
          </div>
          <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" /> Create Campaign</Button>
        </div>

        {/* Create form */}
        {showCreate && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input placeholder="Campaign Name" value={newName} onChange={(e) => setNewName(e.target.value)} className="flex-1" />
                <Input type="number" placeholder="Total Budget ($)" value={newBudget || ""} onChange={(e) => setNewBudget(Number(e.target.value))} className="w-40" />
                <Button onClick={createCampaign} disabled={creating}>{creating ? "Creating..." : "Create"}</Button>
                <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Campaign cards */}
        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading campaigns...</div>
        ) : campaigns.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">No campaigns yet</p>
              <p className="text-sm text-muted-foreground mb-4">Create your first campaign to start managing ad budgets</p>
              <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" /> Create Campaign</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map((c) => (
              <Card key={c.id} className="group hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/admin/campaign/${c.id}`)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base truncate pr-2">{c.name || "Untitled"}</CardTitle>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); setDeleteId(c.id); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Budget:</span>
                      <span className="font-medium">${c.total_budget.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Ads:</span>
                      <span className="font-medium">{c.activeAds}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">ROAS:</span>
                      <span className="font-medium">{c.roas.toFixed(2)}x</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Score:</span>
                      <span className={`font-bold ${getScoreColor(c.score)}`}>{Math.round(c.score)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                    <span>Spend: ${c.totalSpend.toLocaleString()}</span>
                    <span className="flex items-center gap-1 text-primary">Open <ArrowRight className="h-3 w-3" /></span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the campaign and all its ads. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteCampaign} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
