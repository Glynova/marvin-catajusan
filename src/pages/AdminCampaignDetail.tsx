import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Trash2, Plus, RefreshCw, Download, DollarSign,
  TrendingUp, Target, Gauge, CheckCircle2, PauseCircle, XCircle,
  Pencil, Check, X, Activity, Image,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import html2canvas from "html2canvas";

// ─── Types ──────────────────────────────────────────────────
interface Campaign {
  id: string; name: string; total_budget: number;
  testing_pct: number; evaluation_pct: number; scaling_pct: number;
  auto_optimize: boolean;
}
interface Ad {
  id: string; campaign_id: string; creative_name: string; audience: string;
  phase: string; spend: number; revenue: number; ctr: number; cpc: number;
  conversions: number; roas: number; score: number; status: string;
  budget: number; frequency: number;
}

// ─── Helpers ────────────────────────────────────────────────
function calcScore(ad: Ad) {
  return (ad.roas * 40) + (ad.ctr * 20) + ((ad.conversions || 0) * 20) + (Math.min(ad.frequency, 3) / 3 * 20);
}
function evalStatus(ad: Ad) {
  if (ad.roas < 1.5 || ad.ctr < 1) return "KILL";
  if (ad.roas >= 1.5 && ad.roas < 2.5) return "HOLD";
  return "SCALE";
}
function statusColor(s: string) {
  if (s === "KILL") return "bg-red-500/15 text-red-600 border-red-500/30";
  if (s === "HOLD") return "bg-blue-500/15 text-blue-600 border-blue-500/30";
  if (s === "SCALE") return "bg-green-500/15 text-green-600 border-green-500/30";
  return "bg-muted text-muted-foreground";
}
function statusIcon(s: string) {
  if (s === "KILL") return <XCircle className="h-4 w-4" />;
  if (s === "HOLD") return <PauseCircle className="h-4 w-4" />;
  if (s === "SCALE") return <CheckCircle2 className="h-4 w-4" />;
  return null;
}
function scoreColor(n: number) {
  if (n <= 40) return "#ef4444";
  if (n <= 70) return "#3b82f6";
  return "#10b981";
}

function ScoreMeter({ score, size = 80 }: { score: number; size?: number }) {
  const v = Math.min(100, Math.max(0, score));
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (v / 100) * c;
  const col = scoreColor(v);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={4} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={4}
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <span className="absolute text-xs font-bold" style={{ color: col }}>{Math.round(v)}</span>
    </div>
  );
}

const PIE_COLORS = ["#3b82f6", "#f59e0b", "#10b981"];

// ─── Component ──────────────────────────────────────────────
export default function AdminCampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const dashRef = useRef<HTMLDivElement>(null);

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  // Inline editing
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState("");
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetVal, setBudgetVal] = useState(0);

  // New ad form
  const [newAd, setNewAd] = useState({ creative_name: "", audience: "", spend: 0, revenue: 0, ctr: 0, cpc: 0, conversions: 0, frequency: 0 });

  useEffect(() => { checkAuth(); }, []);

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/admin-portal"); return; }
    const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!data) { navigate("/admin-portal"); return; }
    fetchData();
  }

  async function fetchData() {
    if (!id) return;
    setLoading(true);
    const [{ data: c }, { data: a }] = await Promise.all([
      supabase.from("budget_campaigns").select("*").eq("id", id).single(),
      supabase.from("budget_ads").select("*").eq("campaign_id", id).order("created_at"),
    ]);
    if (c) { setCampaign(c as Campaign); setNameVal(c.name); setBudgetVal(c.total_budget); }
    if (a) setAds(a as Ad[]);
    setLoading(false);
  }

  // ─── CRUD ──────────────────────────────────────────────────
  async function saveName() {
    if (!campaign) return;
    await supabase.from("budget_campaigns").update({ name: nameVal }).eq("id", campaign.id);
    setCampaign({ ...campaign, name: nameVal });
    setEditingName(false);
    toast({ title: "Name updated" });
  }

  async function saveBudget() {
    if (!campaign) return;
    await supabase.from("budget_campaigns").update({ total_budget: budgetVal }).eq("id", campaign.id);
    setCampaign({ ...campaign, total_budget: budgetVal });
    setEditingBudget(false);
    toast({ title: "Budget updated" });
  }

  async function updatePct(field: "testing_pct" | "evaluation_pct" | "scaling_pct", val: number) {
    if (!campaign) return;
    const updated = { ...campaign, [field]: val };
    const total = updated.testing_pct + updated.evaluation_pct + updated.scaling_pct;
    if (total > 0 && total !== 100) {
      updated.testing_pct = Math.round((updated.testing_pct / total) * 100);
      updated.evaluation_pct = Math.round((updated.evaluation_pct / total) * 100);
      updated.scaling_pct = 100 - updated.testing_pct - updated.evaluation_pct;
    }
    setCampaign(updated);
    await supabase.from("budget_campaigns").update({
      testing_pct: updated.testing_pct, evaluation_pct: updated.evaluation_pct, scaling_pct: updated.scaling_pct,
    }).eq("id", campaign.id);
  }

  async function toggleAutoOptimize() {
    if (!campaign) return;
    const v = !campaign.auto_optimize;
    setCampaign({ ...campaign, auto_optimize: v });
    await supabase.from("budget_campaigns").update({ auto_optimize: v }).eq("id", campaign.id);
  }

  async function addAd() {
    if (!campaign || !newAd.creative_name.trim()) { toast({ title: "Enter ad name", variant: "destructive" }); return; }
    const roas = newAd.spend > 0 ? newAd.revenue / newAd.spend : 0;
    const ad: any = { ...newAd, campaign_id: campaign.id, roas, phase: "testing", status: "HOLD", score: 0, budget: 0 };
    ad.score = calcScore(ad);
    ad.status = evalStatus(ad);
    const { data, error } = await supabase.from("budget_ads").insert(ad).select().single();
    if (error) { toast({ title: "Error adding ad", variant: "destructive" }); return; }
    setAds([...ads, data as Ad]);
    setNewAd({ creative_name: "", audience: "", spend: 0, revenue: 0, ctr: 0, cpc: 0, conversions: 0, frequency: 0 });
    toast({ title: "Ad added" });
  }

  async function deleteAd(adId: string) {
    await supabase.from("budget_ads").delete().eq("id", adId);
    setAds(ads.filter((a) => a.id !== adId));
    toast({ title: "Ad deleted" });
  }

  async function runEvaluation() {
    if (!campaign || ads.length === 0) return;
    setEvaluating(true);
    const totalBudget = campaign.total_budget;
    const updated = ads.map((ad) => {
      const roas = ad.spend > 0 ? ad.revenue / ad.spend : 0;
      const score = calcScore({ ...ad, roas });
      const status = evalStatus({ ...ad, roas });
      let phase = ad.phase;
      if (status === "KILL") phase = "testing";
      else if (status === "SCALE") phase = "scaling";
      else phase = "evaluation";
      return { ...ad, roas, score, status, phase };
    });

    // Budget allocation
    const scaleAds = updated.filter((a) => a.status === "SCALE");
    const holdAds = updated.filter((a) => a.status === "HOLD");
    const killAds = updated.filter((a) => a.status === "KILL");
    const scaleBudget = (campaign.scaling_pct / 100) * totalBudget;
    const evalBudget = (campaign.evaluation_pct / 100) * totalBudget;
    const testBudget = (campaign.testing_pct / 100) * totalBudget;

    scaleAds.forEach((a) => { a.budget = scaleAds.length > 0 ? scaleBudget / scaleAds.length : 0; });
    holdAds.forEach((a) => { a.budget = holdAds.length > 0 ? evalBudget / holdAds.length : 0; });
    killAds.forEach((a) => { a.budget = killAds.length > 0 ? testBudget / killAds.length : 0; });

    // Auto optimize
    if (campaign.auto_optimize) {
      const avgRoas = updated.reduce((s, a) => s + a.roas, 0) / updated.length;
      if (avgRoas < 1) {
        await updatePct("testing_pct", Math.min(50, campaign.testing_pct + 10));
      } else if (avgRoas > 2) {
        await updatePct("scaling_pct", Math.min(60, campaign.scaling_pct + 10));
      }
    }

    // Save all
    await Promise.all(updated.map((a) =>
      supabase.from("budget_ads").update({
        roas: a.roas, score: a.score, status: a.status, phase: a.phase, budget: a.budget,
      }).eq("id", a.id)
    ));

    // Update campaign_metrics
    const totalSpend = updated.reduce((s, a) => s + a.spend, 0);
    const revenue = updated.reduce((s, a) => s + a.revenue, 0);
    const avgScore = updated.reduce((s, a) => s + a.score, 0) / updated.length;
    const overallRoas = totalSpend > 0 ? revenue / totalSpend : 0;
    await supabase.from("campaign_metrics").upsert({
      campaign_id: campaign.id, total_spend: totalSpend, revenue, roas: overallRoas,
      active_ads: updated.length, score: avgScore,
    }, { onConflict: "campaign_id" });

    setAds(updated);
    setEvaluating(false);
    toast({ title: "Evaluation complete" });
  }

  async function deleteCampaign() {
    if (!campaign) return;
    await supabase.from("budget_ads").delete().eq("campaign_id", campaign.id);
    await supabase.from("campaign_metrics").delete().eq("campaign_id", campaign.id);
    await supabase.from("budget_campaigns").delete().eq("id", campaign.id);
    toast({ title: "Campaign deleted" });
    navigate("/admin/campaigns");
  }

  function exportCSV() {
    if (!campaign) return;
    const header = "Creative,Audience,Phase,Spend,Revenue,CTR,CPC,ROAS,Score,Status,Budget\n";
    const rows = ads.map((a) => `"${a.creative_name}","${a.audience}",${a.phase},${a.spend},${a.revenue},${a.ctr},${a.cpc},${a.roas.toFixed(2)},${a.score.toFixed(1)},${a.status},${a.budget.toFixed(2)}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${campaign.name}-ads.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  async function exportPNG() {
    if (!dashRef.current) return;
    const canvas = await html2canvas(dashRef.current, { scale: 2, backgroundColor: "#ffffff" });
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a"); a.href = url; a.download = `${campaign?.name || "campaign"}-dashboard.png`; a.click();
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!campaign) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Campaign not found</div>;

  // Computed
  const totalSpend = ads.reduce((s, a) => s + a.spend, 0);
  const totalRevenue = ads.reduce((s, a) => s + a.revenue, 0);
  const overallRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const avgScore = ads.length > 0 ? ads.reduce((s, a) => s + a.score, 0) / ads.length : 0;

  const pieData = [
    { name: "Testing", value: campaign.testing_pct },
    { name: "Evaluation", value: campaign.evaluation_pct },
    { name: "Scaling", value: campaign.scaling_pct },
  ];

  const barData = ads.map((a) => ({ name: a.creative_name.substring(0, 12), ROAS: a.roas, Score: a.score / 10 }));

  const phases = ["testing", "evaluation", "scaling"];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="border-b bg-card/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/campaigns")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Campaigns
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-1" /> CSV</Button>
            <Button variant="outline" size="sm" onClick={exportPNG}><Image className="h-4 w-4 mr-1" /> PNG</Button>
            <Button variant="destructive" size="sm" onClick={() => setShowDelete(true)}><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6" ref={dashRef}>
        {/* Campaign name + budget */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            {editingName ? (
              <div className="flex items-center gap-2">
                <Input value={nameVal} onChange={(e) => setNameVal(e.target.value)} className="text-xl font-bold"
                  onKeyDown={(e) => e.key === "Enter" && saveName()} autoFocus />
                <Button size="icon" variant="ghost" onClick={saveName}><Check className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => { setEditingName(false); setNameVal(campaign.name); }}><X className="h-4 w-4" /></Button>
              </div>
            ) : (
              <h2 className="text-2xl font-bold flex items-center gap-2 cursor-pointer group" onClick={() => setEditingName(true)}>
                {campaign.name || "Untitled Campaign"}
                <Pencil className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </h2>
            )}
          </div>
          <div>
            {editingBudget ? (
              <div className="flex items-center gap-2">
                <span className="text-lg font-medium">$</span>
                <Input type="number" value={budgetVal} onChange={(e) => setBudgetVal(Number(e.target.value))} className="w-36"
                  onKeyDown={(e) => e.key === "Enter" && saveBudget()} autoFocus />
                <Button size="icon" variant="ghost" onClick={saveBudget}><Check className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => { setEditingBudget(false); setBudgetVal(campaign.total_budget); }}><X className="h-4 w-4" /></Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setEditingBudget(true)}>
                <span className="text-xl font-bold">${campaign.total_budget.toLocaleString()}</span>
                <Pencil className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Spend", value: `$${totalSpend.toLocaleString()}`, icon: DollarSign, color: "text-blue-500" },
            { label: "Revenue", value: `$${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: "text-green-500" },
            { label: "ROAS", value: `${overallRoas.toFixed(2)}x`, icon: Target, color: overallRoas >= 2 ? "text-green-500" : overallRoas >= 1 ? "text-blue-500" : "text-red-500" },
            { label: "Active Ads", value: ads.length.toString(), icon: Activity, color: "text-purple-500" },
          ].map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="pt-6 flex items-center gap-4">
                <kpi.icon className={`h-8 w-8 ${kpi.color}`} />
                <div>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className="text-xl font-bold">{kpi.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Score meter */}
        <Card>
          <CardContent className="pt-6 flex flex-col sm:flex-row items-center gap-6">
            <ScoreMeter score={avgScore} size={100} />
            <div>
              <p className="font-semibold text-lg">Campaign Score: {Math.round(avgScore)}/100</p>
              <p className="text-sm text-muted-foreground">Based on ROAS, CTR, conversions, and frequency</p>
            </div>
            <div className="sm:ml-auto flex items-center gap-3">
              <Button onClick={runEvaluation} disabled={evaluating || ads.length === 0}>
                <RefreshCw className={`h-4 w-4 mr-1 ${evaluating ? "animate-spin" : ""}`} />
                {evaluating ? "Evaluating..." : "Run Evaluation"}
              </Button>
              <div className="flex items-center gap-2">
                <Switch checked={campaign.auto_optimize} onCheckedChange={toggleAutoOptimize} />
                <Label className="text-xs">Auto</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Budget Distribution */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Budget Distribution</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              {([
                { key: "testing_pct" as const, label: "Testing", color: "#3b82f6" },
                { key: "evaluation_pct" as const, label: "Evaluation", color: "#f59e0b" },
                { key: "scaling_pct" as const, label: "Scaling", color: "#10b981" },
              ]).map((phase) => (
                <div key={phase.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">{phase.label}</Label>
                    <div className="flex items-center gap-2">
                      <Input type="number" min={0} max={100} value={campaign[phase.key]}
                        onChange={(e) => updatePct(phase.key, Number(e.target.value))} className="w-16 h-7 text-xs text-center" />
                      <span className="text-xs text-muted-foreground w-20 text-right">
                        ${((campaign[phase.key] / 100) * campaign.total_budget).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <Slider value={[campaign[phase.key]]} min={0} max={100} step={1}
                    onValueChange={([v]) => updatePct(phase.key, v)} />
                </div>
              ))}
              <div className="flex items-center justify-between text-xs pt-2 border-t">
                <span>Total</span>
                <span className={campaign.testing_pct + campaign.evaluation_pct + campaign.scaling_pct === 100 ? "text-green-500" : "text-red-500"}>
                  {campaign.testing_pct + campaign.evaluation_pct + campaign.scaling_pct}%
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Allocation Overview</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name} ${value}%`}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Ad performance chart */}
        {barData.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Ad Performance</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="ROAS" fill="#3b82f6" radius={[4,4,0,0]} />
                  <Bar dataKey="Score" fill="#10b981" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Add Ad */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" /> Add Ad</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <Input placeholder="Creative Name" value={newAd.creative_name} onChange={(e) => setNewAd({ ...newAd, creative_name: e.target.value })} />
              <Input placeholder="Audience" value={newAd.audience} onChange={(e) => setNewAd({ ...newAd, audience: e.target.value })} />
              <Input type="number" placeholder="Spend" value={newAd.spend || ""} onChange={(e) => setNewAd({ ...newAd, spend: Number(e.target.value) })} />
              <Input type="number" placeholder="Revenue" value={newAd.revenue || ""} onChange={(e) => setNewAd({ ...newAd, revenue: Number(e.target.value) })} />
              <Input type="number" placeholder="CTR (%)" value={newAd.ctr || ""} onChange={(e) => setNewAd({ ...newAd, ctr: Number(e.target.value) })} />
              <Input type="number" placeholder="CPC" value={newAd.cpc || ""} onChange={(e) => setNewAd({ ...newAd, cpc: Number(e.target.value) })} />
              <Input type="number" placeholder="Conversions" value={newAd.conversions || ""} onChange={(e) => setNewAd({ ...newAd, conversions: Number(e.target.value) })} />
              <Input type="number" placeholder="Frequency" value={newAd.frequency || ""} onChange={(e) => setNewAd({ ...newAd, frequency: Number(e.target.value) })} />
            </div>
            <Button onClick={addAd}><Plus className="h-4 w-4 mr-1" /> Add Ad</Button>
          </CardContent>
        </Card>

        {/* Ads by phase */}
        {phases.map((phase) => {
          const phaseAds = ads.filter((a) => a.phase === phase);
          if (phaseAds.length === 0) return null;
          return (
            <Card key={phase}>
              <CardHeader>
                <CardTitle className="text-base capitalize flex items-center gap-2">
                  {phase} Phase
                  <Badge variant="outline">{phaseAds.length} ads</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-2 pr-3">Creative</th>
                        <th className="text-left py-2 pr-3">Audience</th>
                        <th className="text-right py-2 pr-3">Spend</th>
                        <th className="text-right py-2 pr-3">Revenue</th>
                        <th className="text-right py-2 pr-3">ROAS</th>
                        <th className="text-right py-2 pr-3">CTR</th>
                        <th className="text-center py-2 pr-3">Score</th>
                        <th className="text-center py-2 pr-3">Status</th>
                        <th className="text-right py-2 pr-3">Budget</th>
                        <th className="text-right py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {phaseAds.map((ad) => (
                        <tr key={ad.id} className="border-b last:border-0">
                          <td className="py-2 pr-3 font-medium">{ad.creative_name}</td>
                          <td className="py-2 pr-3 text-muted-foreground">{ad.audience}</td>
                          <td className="py-2 pr-3 text-right">${ad.spend.toLocaleString()}</td>
                          <td className="py-2 pr-3 text-right">${ad.revenue.toLocaleString()}</td>
                          <td className="py-2 pr-3 text-right">{ad.roas.toFixed(2)}x</td>
                          <td className="py-2 pr-3 text-right">{ad.ctr.toFixed(1)}%</td>
                          <td className="py-2 pr-3 text-center"><ScoreMeter score={ad.score} size={40} /></td>
                          <td className="py-2 pr-3 text-center">
                            <Badge className={`${statusColor(ad.status)} border text-xs`}>
                              {statusIcon(ad.status)} {ad.status}
                            </Badge>
                          </td>
                          <td className="py-2 pr-3 text-right font-medium">${ad.budget.toFixed(0)}</td>
                          <td className="py-2 text-right">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteAd(ad.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Risk alerts */}
        {ads.some((a) => a.status === "KILL") && (
          <Card className="border-red-500/30">
            <CardContent className="pt-6">
              <p className="text-sm font-medium text-red-600 flex items-center gap-2">
                <XCircle className="h-4 w-4" /> {ads.filter((a) => a.status === "KILL").length} ad(s) marked KILL — consider pausing or replacing
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete dialog */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{campaign.name}"?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this campaign and all its ads.</AlertDialogDescription>
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
