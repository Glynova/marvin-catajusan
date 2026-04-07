import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DollarSign, TrendingUp, TrendingDown, Target, Zap, Download,
  Plus, Trash2, RefreshCw, BarChart3, AlertTriangle, CheckCircle2,
  PauseCircle, XCircle, Activity, Gauge, ArrowUpRight, ArrowDownRight,
  ArrowLeft, Pencil, Check, X,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

// ─── Types ──────────────────────────────────────────────────────────
interface BudgetCampaign {
  id: string;
  name: string;
  total_budget: number;
  testing_pct: number;
  evaluation_pct: number;
  scaling_pct: number;
  auto_optimize: boolean;
}

interface BudgetAd {
  id: string;
  campaign_id: string;
  creative_name: string;
  audience: string;
  phase: string;
  spend: number;
  revenue: number;
  ctr: number;
  cpc: number;
  conversions: number;
  roas: number;
  score: number;
  status: string;
  budget: number;
  frequency: number;
}

// ─── Core Logic ─────────────────────────────────────────────────────
function calculateScore(ad: BudgetAd): number {
  return (ad.roas * 40) + (ad.ctr * 20) + ((ad.conversions || 0) * 20) + (Math.min(ad.frequency, 3) / 3 * 20);
}

function evaluateAd(ad: BudgetAd): string {
  if (ad.roas < 1.5 || ad.ctr < 1) return "KILL";
  if (ad.roas >= 1.5 && ad.roas < 2.5) return "HOLD";
  return "SCALE";
}

function getStatusColor(status: string) {
  switch (status) {
    case "KILL": return "bg-red-500/15 text-red-600 border-red-500/30";
    case "HOLD": return "bg-blue-500/15 text-blue-600 border-blue-500/30";
    case "SCALE": return "bg-green-500/15 text-green-600 border-green-500/30";
    default: return "bg-muted text-muted-foreground";
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "KILL": return <XCircle className="h-4 w-4" />;
    case "HOLD": return <PauseCircle className="h-4 w-4" />;
    case "SCALE": return <CheckCircle2 className="h-4 w-4" />;
    default: return null;
  }
}

function getScoreColor(score: number): string {
  if (score <= 40) return "#ef4444";
  if (score <= 70) return "#3b82f6";
  return "#10b981";
}

// ─── Score Meter ────────────────────────────────────────────────────
function ScoreMeter({ score, size = 80 }: { score: number; size?: number }) {
  const normalized = Math.min(100, Math.max(0, score));
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalized / 100) * circumference;
  const color = getScoreColor(normalized);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={4} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-700"
        />
      </svg>
      <span className="absolute text-xs font-bold" style={{ color }}>{Math.round(normalized)}</span>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function BudgetAllocation() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const dashRef = useRef<HTMLDivElement>(null);

  const [campaign, setCampaign] = useState<BudgetCampaign | null>(null);
  const [ads, setAds] = useState<BudgetAd[]>([]);
  const [loading, setLoading] = useState(true);

  // Inline edit states
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [editingBudget, setEditingBudget] = useState(false);
  const [editBudget, setEditBudget] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // New campaign form
  const [newName, setNewName] = useState("");
  const [newBudget, setNewBudget] = useState("10000");

  // New ad form
  const [newAd, setNewAd] = useState({
    creative_name: "", audience: "", phase: "testing",
    spend: "", revenue: "", ctr: "", cpc: "", conversions: "", frequency: "",
  });

  // ── Load ──
  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: camps } = await supabase.from("budget_campaigns").select("*").order("created_at", { ascending: false }).limit(1);
    if (camps && camps.length > 0) {
      const c = camps[0] as unknown as BudgetCampaign;
      setCampaign(c);
      const { data: adRows } = await supabase.from("budget_ads").select("*").eq("campaign_id", c.id);
      setAds((adRows || []) as unknown as BudgetAd[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Create Campaign ──
  const createCampaign = async () => {
    const budget = parseFloat(newBudget) || 0;
    if (!newName || budget <= 0) {
      toast({ title: "Enter campaign name and budget", variant: "destructive" });
      return;
    }
    const { data, error } = await supabase.from("budget_campaigns").insert({
      name: newName, total_budget: budget,
      testing_pct: 30, evaluation_pct: 30, scaling_pct: 40,
    }).select().single();
    if (error) {
      toast({ title: "Error creating campaign", description: error.message, variant: "destructive" });
      return;
    }
    setCampaign(data as unknown as BudgetCampaign);
    setAds([]);
    toast({ title: "Campaign Created" });
  };

  // ── Update Phase % ──
  const updatePhase = async (field: string, value: number) => {
    if (!campaign) return;
    const updated = { ...campaign, [field]: value };

    // Auto-balance: adjust the other two proportionally
    const fields = ["testing_pct", "evaluation_pct", "scaling_pct"];
    const others = fields.filter(f => f !== field);
    const remaining = 100 - value;
    const otherSum = (updated as any)[others[0]] + (updated as any)[others[1]];
    if (otherSum > 0) {
      (updated as any)[others[0]] = Math.round((updated as any)[others[0]] / otherSum * remaining);
      (updated as any)[others[1]] = 100 - value - (updated as any)[others[0]];
    } else {
      (updated as any)[others[0]] = Math.round(remaining / 2);
      (updated as any)[others[1]] = remaining - (updated as any)[others[0]];
    }

    setCampaign(updated);
    await supabase.from("budget_campaigns").update({
      testing_pct: updated.testing_pct,
      evaluation_pct: updated.evaluation_pct,
      scaling_pct: updated.scaling_pct,
    }).eq("id", campaign.id);
  };

  // ── Add Ad ──
  const addAd = async () => {
    if (!campaign) return;
    const spend = parseFloat(newAd.spend) || 0;
    const revenue = parseFloat(newAd.revenue) || 0;
    const ctr = parseFloat(newAd.ctr) || 0;
    const cpc = parseFloat(newAd.cpc) || 0;
    const conversions = parseInt(newAd.conversions) || 0;
    const frequency = parseFloat(newAd.frequency) || 1;
    const roas = spend > 0 ? revenue / spend : 0;

    const adObj: Partial<BudgetAd> = {
      campaign_id: campaign.id,
      creative_name: newAd.creative_name || `Ad ${ads.length + 1}`,
      audience: newAd.audience || "General",
      phase: newAd.phase,
      spend, revenue, ctr, cpc, conversions, roas, frequency,
      budget: 0, score: 0, status: "HOLD",
    };

    // Calculate score & status
    adObj.score = calculateScore(adObj as BudgetAd);
    adObj.status = evaluateAd(adObj as BudgetAd);

    // Auto-allocate budget based on phase
    const phasePct = newAd.phase === "testing" ? campaign.testing_pct
      : newAd.phase === "evaluation" ? campaign.evaluation_pct
      : campaign.scaling_pct;
    const phaseAds = ads.filter(a => a.phase === newAd.phase).length + 1;
    adObj.budget = (campaign.total_budget * phasePct / 100) / phaseAds;

    const { data, error } = await supabase.from("budget_ads").insert([adObj as any]).select().single();
    if (error) {
      toast({ title: "Error adding ad", description: error.message, variant: "destructive" });
      return;
    }
    setAds(prev => [...prev, data as unknown as BudgetAd]);
    setNewAd({ creative_name: "", audience: "", phase: "testing", spend: "", revenue: "", ctr: "", cpc: "", conversions: "", frequency: "" });
    toast({ title: "Ad Added", description: `Status: ${adObj.status}` });
  };

  // ── Delete Ad ──
  const deleteAd = async (id: string) => {
    await supabase.from("budget_ads").delete().eq("id", id);
    setAds(prev => prev.filter(a => a.id !== id));
    toast({ title: "Ad Removed" });
  };

  // ── Run Evaluation (recalc all) ──
  const runEvaluation = async () => {
    if (!campaign) return;
    const updated = ads.map(ad => {
      const roas = ad.spend > 0 ? ad.revenue / ad.spend : 0;
      const score = calculateScore({ ...ad, roas });
      const status = evaluateAd({ ...ad, roas });
      return { ...ad, roas, score, status };
    });

    // Reallocate budgets per phase to SCALE winners
    const phases = ["testing", "evaluation", "scaling"];
    phases.forEach(phase => {
      const phasePct = phase === "testing" ? campaign.testing_pct
        : phase === "evaluation" ? campaign.evaluation_pct
        : campaign.scaling_pct;
      const phaseBudget = campaign.total_budget * phasePct / 100;
      const phaseAds = updated.filter(a => a.phase === phase);
      const winners = phaseAds.filter(a => a.status === "SCALE");

      if (winners.length > 0) {
        const budgetPerWinner = phaseBudget / winners.length;
        phaseAds.forEach(a => {
          a.budget = a.status === "SCALE" ? budgetPerWinner : 0;
        });
      } else {
        const activeAds = phaseAds.filter(a => a.status !== "KILL");
        if (activeAds.length > 0) {
          const budgetPerAd = phaseBudget / activeAds.length;
          phaseAds.forEach(a => {
            a.budget = a.status !== "KILL" ? budgetPerAd : 0;
          });
        }
      }
    });

    // Persist
    for (const ad of updated) {
      await supabase.from("budget_ads").update({
        roas: ad.roas, score: ad.score, status: ad.status, budget: ad.budget,
      }).eq("id", ad.id);
    }

    setAds(updated);
    toast({ title: "Evaluation Complete", description: `${updated.filter(a => a.status === "SCALE").length} ads marked for scaling.` });
  };

  // ── Toggle Auto Optimize ──
  const toggleAutoOptimize = async (val: boolean) => {
    if (!campaign) return;
    setCampaign({ ...campaign, auto_optimize: val });
    await supabase.from("budget_campaigns").update({ auto_optimize: val }).eq("id", campaign.id);
    toast({ title: val ? "Auto-Optimization Enabled" : "Auto-Optimization Disabled" });
  };

  // ── Save Name ──
  const saveName = async () => {
    if (!campaign || !editName.trim()) return;
    await supabase.from("budget_campaigns").update({ name: editName.trim() }).eq("id", campaign.id);
    setCampaign({ ...campaign, name: editName.trim() });
    setEditingName(false);
    toast({ title: "Campaign name updated" });
  };

  // ── Save Budget ──
  const saveBudget = async () => {
    if (!campaign) return;
    const val = parseFloat(editBudget) || 0;
    if (val <= 0) { toast({ title: "Enter a valid budget", variant: "destructive" }); return; }
    await supabase.from("budget_campaigns").update({ total_budget: val }).eq("id", campaign.id);
    setCampaign({ ...campaign, total_budget: val });
    setEditingBudget(false);
    toast({ title: "Budget updated" });
  };

  // ── Delete Campaign ──
  const deleteCampaign = async () => {
    if (!campaign) return;
    await supabase.from("budget_ads").delete().eq("campaign_id", campaign.id);
    await supabase.from("budget_campaigns").delete().eq("id", campaign.id);
    setCampaign(null);
    setAds([]);
    setShowDeleteDialog(false);
    toast({ title: "Campaign deleted" });
  };

  // ── Export CSV ──
  const exportCSV = () => {
    if (!ads.length) return;
    const headers = "Creative,Audience,Phase,Spend,Revenue,CTR,CPC,Conversions,ROAS,Score,Status,Budget";
    const rows = ads.map(a =>
      `"${a.creative_name}","${a.audience}",${a.phase},${a.spend},${a.revenue},${a.ctr},${a.cpc},${a.conversions},${a.roas.toFixed(2)},${a.score.toFixed(1)},${a.status},${a.budget.toFixed(2)}`
    );
    const blob = new Blob([headers + "\n" + rows.join("\n")], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `budget_allocation_${campaign?.name || "export"}.csv`;
    link.click();
  };

  // ── Export PNG ──
  const exportPNG = async () => {
    if (!dashRef.current) return;
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(dashRef.current, { scale: 2, backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `budget_allocation_${campaign?.name || "export"}.png`;
      link.click();
    } catch {
      toast({ title: "Export Failed", variant: "destructive" });
    }
  };

  // ── Derived Data ──
  const totalSpend = ads.reduce((s, a) => s + a.spend, 0);
  const totalRevenue = ads.reduce((s, a) => s + a.revenue, 0);
  const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const activeAds = ads.filter(a => a.status !== "KILL").length;
  const testingAds = ads.filter(a => a.phase === "testing");
  const evaluationAds = ads.filter(a => a.phase === "evaluation");
  const scalingAds = ads.filter(a => a.phase === "scaling");

  const overallScore = ads.length > 0 ? ads.reduce((s, a) => s + a.score, 0) / ads.length : 0;

  const phaseDistribution = campaign ? [
    { name: "Testing", value: campaign.testing_pct, budget: campaign.total_budget * campaign.testing_pct / 100, fill: "#3b82f6" },
    { name: "Evaluation", value: campaign.evaluation_pct, budget: campaign.total_budget * campaign.evaluation_pct / 100, fill: "#f59e0b" },
    { name: "Scaling", value: campaign.scaling_pct, budget: campaign.total_budget * campaign.scaling_pct / 100, fill: "#10b981" },
  ] : [];

  const statusBreakdown = [
    { name: "Scale", value: ads.filter(a => a.status === "SCALE").length, fill: "#10b981" },
    { name: "Hold", value: ads.filter(a => a.status === "HOLD").length, fill: "#3b82f6" },
    { name: "Kill", value: ads.filter(a => a.status === "KILL").length, fill: "#ef4444" },
  ].filter(s => s.value > 0);

  const adPerformance = ads.map(a => ({
    name: a.creative_name.substring(0, 12),
    ROAS: a.roas,
    Score: a.score,
  }));

  // ── No Campaign ──
  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;

  if (!campaign) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> New Budget Campaign</CardTitle>
            <CardDescription>Set up your campaign to begin budget allocation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Campaign Name</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Q1 Facebook Ads" />
            </div>
            <div>
              <Label>Total Budget ($)</Label>
              <Input type="number" value={newBudget} onChange={e => setNewBudget(e.target.value)} placeholder="10000" />
            </div>
            <Button onClick={createCampaign} className="w-full"><Plus className="h-4 w-4 mr-1" /> Create Campaign</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Render PhaseTable ──
  const PhaseTable = ({ title, phase, phaseAds, color }: { title: string; phase: string; phaseAds: BudgetAd[]; color: string }) => {
    const phasePct = phase === "testing" ? campaign.testing_pct : phase === "evaluation" ? campaign.evaluation_pct : campaign.scaling_pct;
    const phaseBudget = campaign.total_budget * phasePct / 100;

    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
              {title}
            </CardTitle>
            <Badge variant="outline" className="text-xs">${phaseBudget.toLocaleString(undefined, { maximumFractionDigits: 0 })} budget</Badge>
          </div>
          <Progress value={phasePct} className="h-2 mt-2" />
        </CardHeader>
        <CardContent>
          {phaseAds.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No ads in this phase</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 px-2 font-medium">Creative</th>
                    {phase === "testing" && <><th className="text-right py-2 px-2 font-medium">CTR</th><th className="text-right py-2 px-2 font-medium">CPC</th><th className="text-right py-2 px-2 font-medium">Spend</th></>}
                    {phase === "evaluation" && <><th className="text-right py-2 px-2 font-medium">ROAS</th><th className="text-right py-2 px-2 font-medium">Conv.</th><th className="text-right py-2 px-2 font-medium">CPA</th><th className="text-right py-2 px-2 font-medium">Score</th></>}
                    {phase === "scaling" && <><th className="text-right py-2 px-2 font-medium">Budget</th><th className="text-right py-2 px-2 font-medium">ROAS</th><th className="text-right py-2 px-2 font-medium">Freq.</th><th className="text-right py-2 px-2 font-medium">Score</th></>}
                    <th className="text-center py-2 px-2 font-medium">Status</th>
                    <th className="py-2 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {phaseAds.map(ad => {
                    const cpa = ad.conversions > 0 ? ad.spend / ad.conversions : 0;
                    return (
                      <tr key={ad.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-2 px-2 font-medium">{ad.creative_name}</td>
                        {phase === "testing" && (
                          <>
                            <td className="text-right py-2 px-2">{ad.ctr.toFixed(2)}%</td>
                            <td className="text-right py-2 px-2">${ad.cpc.toFixed(2)}</td>
                            <td className="text-right py-2 px-2">${ad.spend.toFixed(2)}</td>
                          </>
                        )}
                        {phase === "evaluation" && (
                          <>
                            <td className="text-right py-2 px-2">{ad.roas.toFixed(2)}x</td>
                            <td className="text-right py-2 px-2">{ad.conversions}</td>
                            <td className="text-right py-2 px-2">${cpa.toFixed(2)}</td>
                            <td className="text-right py-2 px-2"><ScoreMeter score={ad.score} size={40} /></td>
                          </>
                        )}
                        {phase === "scaling" && (
                          <>
                            <td className="text-right py-2 px-2">${ad.budget.toFixed(2)}</td>
                            <td className="text-right py-2 px-2">{ad.roas.toFixed(2)}x</td>
                            <td className="text-right py-2 px-2">{ad.frequency.toFixed(1)}</td>
                            <td className="text-right py-2 px-2"><ScoreMeter score={ad.score} size={40} /></td>
                          </>
                        )}
                        <td className="text-center py-2 px-2">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full border ${getStatusColor(ad.status)}`}>
                            {getStatusIcon(ad.status)} {ad.status}
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteAd(ad.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6" ref={dashRef}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-heading font-bold flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" /> {campaign.name}
          </h2>
          <p className="text-sm text-muted-foreground">Total Budget: ${campaign.total_budget.toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Switch checked={campaign.auto_optimize} onCheckedChange={toggleAutoOptimize} />
            <Label className="text-sm">Auto Optimize</Label>
          </div>
          <Button size="sm" onClick={runEvaluation}><RefreshCw className="h-4 w-4 mr-1" /> Run Evaluation</Button>
          <Button size="sm" variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-1" /> CSV</Button>
          <Button size="sm" variant="outline" onClick={exportPNG}><Download className="h-4 w-4 mr-1" /> PNG</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Total Spend</span>
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <p className="text-xl font-bold">${totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Revenue</span>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <p className="text-xl font-bold">${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Avg ROAS</span>
              <Target className="h-4 w-4 text-primary" />
            </div>
            <p className="text-xl font-bold">{avgRoas.toFixed(2)}x</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Active Ads</span>
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <p className="text-xl font-bold">{activeAds} / {ads.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Score</span>
              <p className="text-xl font-bold">{overallScore.toFixed(0)}</p>
            </div>
            <ScoreMeter score={overallScore} size={56} />
          </CardContent>
        </Card>
      </div>

      {/* Budget Control Panel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Gauge className="h-5 w-5" /> Budget Phase Distribution</CardTitle>
          <CardDescription>Adjust budget allocation across phases (must total 100%)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { label: "Testing", field: "testing_pct", value: campaign.testing_pct, color: "#3b82f6" },
              { label: "Evaluation", field: "evaluation_pct", value: campaign.evaluation_pct, color: "#f59e0b" },
              { label: "Scaling", field: "scaling_pct", value: campaign.scaling_pct, color: "#10b981" },
            ].map(phase => (
              <div key={phase.field} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: phase.color }} />
                    <Label className="font-medium">{phase.label}</Label>
                  </div>
                  <span className="text-sm font-bold">{phase.value}%</span>
                </div>
                <Slider
                  value={[phase.value]}
                  onValueChange={([v]) => updatePhase(phase.field, v)}
                  max={100} min={0} step={1}
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>${(campaign.total_budget * phase.value / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  <span>{ads.filter(a => a.phase === phase.label.toLowerCase()).length} ads</span>
                </div>
                <Progress value={phase.value} className="h-1.5" />
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <Badge variant={campaign.testing_pct + campaign.evaluation_pct + campaign.scaling_pct === 100 ? "default" : "destructive"}>
              Total: {campaign.testing_pct + campaign.evaluation_pct + campaign.scaling_pct}%
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      {ads.length > 0 && (
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Phase Distribution</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={phaseDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value"
                    label={({ name, value }) => `${name} ${value}%`} labelLine={false}>
                    {phaseDistribution.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v}%`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Status Breakdown</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusBreakdown} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}>
                    {statusBreakdown.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Ad Performance</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={adPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="ROAS" fill="#10b981" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Ad Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Plus className="h-5 w-5" /> Add Ad Creative</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Input placeholder="Creative Name" value={newAd.creative_name} onChange={e => setNewAd({ ...newAd, creative_name: e.target.value })} />
            <Input placeholder="Audience" value={newAd.audience} onChange={e => setNewAd({ ...newAd, audience: e.target.value })} />
            <Select value={newAd.phase} onValueChange={v => setNewAd({ ...newAd, phase: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="testing">🧪 Testing</SelectItem>
                <SelectItem value="evaluation">📈 Evaluation</SelectItem>
                <SelectItem value="scaling">🚀 Scaling</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Spend ($)" type="number" value={newAd.spend} onChange={e => setNewAd({ ...newAd, spend: e.target.value })} />
            <Input placeholder="Revenue ($)" type="number" value={newAd.revenue} onChange={e => setNewAd({ ...newAd, revenue: e.target.value })} />
            <Input placeholder="CTR (%)" type="number" value={newAd.ctr} onChange={e => setNewAd({ ...newAd, ctr: e.target.value })} />
            <Input placeholder="CPC ($)" type="number" value={newAd.cpc} onChange={e => setNewAd({ ...newAd, cpc: e.target.value })} />
            <Input placeholder="Conversions" type="number" value={newAd.conversions} onChange={e => setNewAd({ ...newAd, conversions: e.target.value })} />
            <Input placeholder="Frequency" type="number" value={newAd.frequency} onChange={e => setNewAd({ ...newAd, frequency: e.target.value })} />
            <Button onClick={addAd} className="w-full"><Plus className="h-4 w-4 mr-1" /> Add</Button>
          </div>
        </CardContent>
      </Card>

      {/* Phase Tables */}
      <PhaseTable title="🧪 Testing Phase" phase="testing" phaseAds={testingAds} color="#3b82f6" />
      <PhaseTable title="📈 Evaluation Phase" phase="evaluation" phaseAds={evaluationAds} color="#f59e0b" />
      <PhaseTable title="🚀 Scaling Phase" phase="scaling" phaseAds={scalingAds} color="#10b981" />

      {/* Risk Alerts */}
      {ads.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Risk Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {ads.filter(a => a.status === "KILL").map(a => (
              <div key={a.id} className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 text-red-600 text-sm">
                <TrendingDown className="h-4 w-4 shrink-0" />
                <span><strong>{a.creative_name}</strong> — ROAS {a.roas.toFixed(2)}x, CTR {a.ctr.toFixed(2)}%. Recommend killing.</span>
              </div>
            ))}
            {ads.filter(a => a.status === "SCALE").map(a => (
              <div key={a.id} className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 text-green-600 text-sm">
                <ArrowUpRight className="h-4 w-4 shrink-0" />
                <span><strong>{a.creative_name}</strong> — ROAS {a.roas.toFixed(2)}x. Top performer, scale budget.</span>
              </div>
            ))}
            {ads.filter(a => a.status === "KILL").length === 0 && ads.filter(a => a.status === "SCALE").length === 0 && (
              <p className="text-sm text-muted-foreground">No risk alerts. All ads are in HOLD status.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
