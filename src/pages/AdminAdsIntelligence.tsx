import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import BudgetAllocation from "@/components/BudgetAllocation";
import ProfitAnalyzer from "@/components/ProfitAnalyzer";
import AIPredictionEngine from "@/components/AIPredictionEngine";
import FunnelLeakDetector from "@/components/FunnelLeakDetector";
import FunnelOptimizer from "@/components/FunnelOptimizer";
import {
  Upload, BarChart3, TrendingUp, TrendingDown, AlertTriangle,
  DollarSign, Target, MousePointerClick, Eye, Download, FileText,
  Brain, Zap, Sparkles, Wallet, Image as ImageIcon,
  PieChart as PieChartIcon, Gauge, Search,
} from "lucide-react";
import AdminNavbar from "@/components/AdminNavbar";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from "recharts";

interface CampaignRow {
  campaign?: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  revenue: number;
  ctr?: number;
  cpc?: number;
  cpl?: number;
  roas?: number;
  conversionRate?: number;
}

interface AggregateMetrics {
  totalImpressions: number;
  totalClicks: number;
  totalSpend: number;
  totalConversions: number;
  totalRevenue: number;
  avgCtr: string;
  avgCpc: string;
  avgCpl: string;
  roas: string;
  conversionRate: string;
}

interface AIAnalysis {
  executiveSummary: string;
  keyInsights: string[];
  bottlenecks: string[];
  riskLevel: string;
  riskAnalysis: string;
  budgetRecommendations: string[];
  scalingStrategy: string;
}

interface RuleInsight {
  type: "warning" | "success" | "info";
  message: string;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

function parseCSV(text: string): CampaignRow[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/[^a-z_]/g, ""));
  return lines.slice(1).filter(Boolean).map((line) => {
    const vals = line.split(",").map((v) => v.trim());
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => (obj[h] = vals[i] || "0"));
    return {
      campaign: obj.campaign || obj.campaign_name || obj.name || "Campaign",
      impressions: parseFloat(obj.impressions) || 0,
      clicks: parseFloat(obj.clicks) || 0,
      spend: parseFloat(obj.spend || obj.cost) || 0,
      conversions: parseFloat(obj.conversions || obj.results) || 0,
      revenue: parseFloat(obj.revenue || obj.value || obj.conversion_value) || 0,
    };
  });
}

function calculateMetrics(rows: CampaignRow[]): { campaigns: CampaignRow[]; aggregate: AggregateMetrics } {
  const campaigns = rows.map((r) => ({
    ...r,
    ctr: r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0,
    cpc: r.clicks > 0 ? r.spend / r.clicks : 0,
    cpl: r.conversions > 0 ? r.spend / r.conversions : 0,
    roas: r.spend > 0 ? r.revenue / r.spend : 0,
    conversionRate: r.clicks > 0 ? (r.conversions / r.clicks) * 100 : 0,
  }));
  const totals = campaigns.reduce(
    (a, c) => ({
      impressions: a.impressions + c.impressions,
      clicks: a.clicks + c.clicks,
      spend: a.spend + c.spend,
      conversions: a.conversions + c.conversions,
      revenue: a.revenue + c.revenue,
    }),
    { impressions: 0, clicks: 0, spend: 0, conversions: 0, revenue: 0 }
  );
  return {
    campaigns,
    aggregate: {
      totalImpressions: totals.impressions,
      totalClicks: totals.clicks,
      totalSpend: totals.spend,
      totalConversions: totals.conversions,
      totalRevenue: totals.revenue,
      avgCtr: totals.impressions > 0 ? ((totals.clicks / totals.impressions) * 100).toFixed(2) : "0",
      avgCpc: totals.clicks > 0 ? (totals.spend / totals.clicks).toFixed(2) : "0",
      avgCpl: totals.conversions > 0 ? (totals.spend / totals.conversions).toFixed(2) : "0",
      roas: totals.spend > 0 ? (totals.revenue / totals.spend).toFixed(2) : "0",
      conversionRate: totals.clicks > 0 ? ((totals.conversions / totals.clicks) * 100).toFixed(2) : "0",
    },
  };
}

function getRuleInsights(agg: AggregateMetrics, campaigns: CampaignRow[]): RuleInsight[] {
  const insights: RuleInsight[] = [];
  if (parseFloat(agg.avgCtr) < 2) insights.push({ type: "warning", message: `Low CTR (${agg.avgCtr}%) — review ad creatives and targeting.` });
  if (parseFloat(agg.roas) > 5) insights.push({ type: "success", message: `Strong ROAS (${agg.roas}x) — consider scaling spend.` });
  if (parseFloat(agg.roas) < 1) insights.push({ type: "warning", message: `Negative ROAS (${agg.roas}x) — campaigns are losing money.` });
  if (agg.totalConversions < 10) insights.push({ type: "info", message: `Low conversion volume (${agg.totalConversions}) — data may not be statistically reliable.` });
  if (parseFloat(agg.avgCpc) > 5) insights.push({ type: "warning", message: `High CPC ($${agg.avgCpc}) — optimize bidding strategy.` });
  if (parseFloat(agg.conversionRate) > 5) insights.push({ type: "success", message: `Strong conversion rate (${agg.conversionRate}%) — funnel is performing well.` });
  campaigns.forEach((c) => {
    if (c.roas && c.roas < 0.5) insights.push({ type: "warning", message: `"${c.campaign}" has very low ROAS (${c.roas?.toFixed(2)}x) — consider pausing.` });
  });
  return insights;
}

const AdminAdsIntelligence = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const dashRef = useRef<HTMLDivElement>(null);

  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [aggregate, setAggregate] = useState<AggregateMetrics | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [ruleInsights, setRuleInsights] = useState<RuleInsight[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [tab, setTab] = useState("input");

  // Manual input state
  const [manual, setManual] = useState({ campaign: "", impressions: "", clicks: "", spend: "", conversions: "", revenue: "" });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate("/admin-portal");
    });
  }, [navigate]);

  const handleCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rows = parseCSV(ev.target?.result as string);
      if (rows.length === 0) {
        toast({ title: "Invalid CSV", description: "No data rows found.", variant: "destructive" });
        return;
      }
      const { campaigns: c, aggregate: a } = calculateMetrics(rows);
      setCampaigns(c);
      setAggregate(a);
      setRuleInsights(getRuleInsights(a, c));
      setAnalysis(null);
      setTab("dashboard");
      toast({ title: "Data Loaded", description: `${c.length} campaigns imported.` });
    };
    reader.readAsText(file);
  };

  const addManual = () => {
    const row: CampaignRow = {
      campaign: manual.campaign || `Campaign ${campaigns.length + 1}`,
      impressions: parseFloat(manual.impressions) || 0,
      clicks: parseFloat(manual.clicks) || 0,
      spend: parseFloat(manual.spend) || 0,
      conversions: parseFloat(manual.conversions) || 0,
      revenue: parseFloat(manual.revenue) || 0,
    };
    const all = [...campaigns.map(({ ctr, cpc, cpl, roas, conversionRate, ...r }) => r), row];
    const { campaigns: c, aggregate: a } = calculateMetrics(all);
    setCampaigns(c);
    setAggregate(a);
    setRuleInsights(getRuleInsights(a, c));
    setManual({ campaign: "", impressions: "", clicks: "", spend: "", conversions: "", revenue: "" });
    toast({ title: "Campaign Added" });
  };

  const runAI = async () => {
    if (!aggregate || campaigns.length === 0) return;
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("ads-analysis", {
        body: { metrics: aggregate, campaigns },
      });
      if (error) throw error;
      setAnalysis(data as AIAnalysis);
      setTab("report");
      toast({ title: "AI Analysis Complete", description: "Report generated successfully." });
    } catch (err: unknown) {
      toast({ title: "Analysis Failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const exportCSV = () => {
    if (!campaigns.length) return;
    const headers = "Campaign,Impressions,Clicks,Spend,Conversions,Revenue,CTR%,CPC,CPL,ROAS,ConvRate%";
    const rows = campaigns.map((c) =>
      `"${c.campaign}",${c.impressions},${c.clicks},${c.spend.toFixed(2)},${c.conversions},${c.revenue.toFixed(2)},${c.ctr?.toFixed(2)},${c.cpc?.toFixed(2)},${c.cpl?.toFixed(2)},${c.roas?.toFixed(2)},${c.conversionRate?.toFixed(2)}`
    );
    const blob = new Blob([headers + "\n" + rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ads_intelligence_report.csv";
    a.click();
  };

  const exportPNG = async () => {
    if (!dashRef.current) return;
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(dashRef.current, { scale: 2, backgroundColor: "#ffffff" });
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = "ads_dashboard.png";
      a.click();
    } catch {
      toast({ title: "Export Failed", description: "Could not capture dashboard.", variant: "destructive" });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin-portal");
  };

  const funnelData = aggregate
    ? [
        { name: "Impressions", value: aggregate.totalImpressions },
        { name: "Clicks", value: aggregate.totalClicks },
        { name: "Conversions", value: aggregate.totalConversions },
      ]
    : [];

  const spendVsRevenue = campaigns.map((c) => ({
    name: c.campaign?.substring(0, 15) || "N/A",
    Spend: c.spend,
    Revenue: c.revenue,
  }));

  const roasChart = campaigns.map((c) => ({
    name: c.campaign?.substring(0, 15) || "N/A",
    ROAS: c.roas || 0,
  }));

  return (
    <div className="min-h-screen bg-background">
      <AdminNavbar />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="input"><Upload className="h-4 w-4 mr-1" /> Data Input</TabsTrigger>
            <TabsTrigger value="dashboard" disabled={!aggregate}><BarChart3 className="h-4 w-4 mr-1" /> Dashboard</TabsTrigger>
            <TabsTrigger value="report" disabled={!analysis}><FileText className="h-4 w-4 mr-1" /> AI Report</TabsTrigger>
            <TabsTrigger value="budget"><Wallet className="h-4 w-4 mr-1" /> Budget Allocation</TabsTrigger>
            <TabsTrigger value="profit"><PieChartIcon className="h-4 w-4 mr-1" /> Profit Analyzer</TabsTrigger>
            <TabsTrigger value="predictions"><Brain className="h-4 w-4 mr-1" /> AI Predictions</TabsTrigger>
            <TabsTrigger value="funnel-leak"><Search className="h-4 w-4 mr-1" /> Funnel Leaks</TabsTrigger>
            <TabsTrigger value="funnel-optimize"><Gauge className="h-4 w-4 mr-1" /> Funnel Optimizer</TabsTrigger>
          </TabsList>

          {/* DATA INPUT TAB */}
          <TabsContent value="input">
            <div className="grid md:grid-cols-2 gap-6">
              {/* CSV Upload */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> CSV Upload</CardTitle>
                  <CardDescription>Upload Meta Ads or Google Ads export CSV</CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-1">Click to upload or drag & drop</p>
                    <p className="text-xs text-muted-foreground">CSV with: impressions, clicks, spend, conversions, revenue</p>
                  </div>
                  <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSV} />
                </CardContent>
              </Card>

              {/* Manual Input */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5" /> Manual Entry</CardTitle>
                  <CardDescription>Add campaign data manually</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input placeholder="Campaign Name" value={manual.campaign} onChange={(e) => setManual({ ...manual, campaign: e.target.value })} />
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Impressions" type="number" value={manual.impressions} onChange={(e) => setManual({ ...manual, impressions: e.target.value })} />
                    <Input placeholder="Clicks" type="number" value={manual.clicks} onChange={(e) => setManual({ ...manual, clicks: e.target.value })} />
                    <Input placeholder="Spend ($)" type="number" value={manual.spend} onChange={(e) => setManual({ ...manual, spend: e.target.value })} />
                    <Input placeholder="Conversions" type="number" value={manual.conversions} onChange={(e) => setManual({ ...manual, conversions: e.target.value })} />
                    <Input placeholder="Revenue ($)" type="number" value={manual.revenue} onChange={(e) => setManual({ ...manual, revenue: e.target.value })} />
                  </div>
                  <Button onClick={addManual} className="w-full">Add Campaign</Button>
                </CardContent>
              </Card>
            </div>

            {/* Preview Table */}
            {campaigns.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Loaded Campaigns ({campaigns.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 font-medium text-muted-foreground">Campaign</th>
                          <th className="text-right py-2 px-3 font-medium text-muted-foreground">Impressions</th>
                          <th className="text-right py-2 px-3 font-medium text-muted-foreground">Clicks</th>
                          <th className="text-right py-2 px-3 font-medium text-muted-foreground">Spend</th>
                          <th className="text-right py-2 px-3 font-medium text-muted-foreground">Conv.</th>
                          <th className="text-right py-2 px-3 font-medium text-muted-foreground">Revenue</th>
                          <th className="text-right py-2 px-3 font-medium text-muted-foreground">ROAS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaigns.map((c, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="py-2 px-3">{c.campaign}</td>
                            <td className="text-right py-2 px-3">{c.impressions.toLocaleString()}</td>
                            <td className="text-right py-2 px-3">{c.clicks.toLocaleString()}</td>
                            <td className="text-right py-2 px-3">${c.spend.toFixed(2)}</td>
                            <td className="text-right py-2 px-3">{c.conversions}</td>
                            <td className="text-right py-2 px-3">${c.revenue.toFixed(2)}</td>
                            <td className="text-right py-2 px-3">
                              <Badge variant={c.roas && c.roas >= 1 ? "default" : "destructive"}>{c.roas?.toFixed(2)}x</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button onClick={() => setTab("dashboard")}>
                      <BarChart3 className="h-4 w-4 mr-1" /> View Dashboard
                    </Button>
                    <Button onClick={runAI} disabled={analyzing} variant="secondary">
                      <Sparkles className="h-4 w-4 mr-1" /> {analyzing ? "Analyzing..." : "Generate AI Report"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* DASHBOARD TAB */}
          <TabsContent value="dashboard">
            <div ref={dashRef}>
              {aggregate && (
                <>
                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <Card>
                      <CardContent className="pt-5 pb-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">ROAS</span>
                          <TrendingUp className="h-4 w-4 text-primary" />
                        </div>
                        <p className="text-2xl font-bold">{aggregate.roas}x</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-5 pb-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Spend</span>
                          <DollarSign className="h-4 w-4 text-primary" />
                        </div>
                        <p className="text-2xl font-bold">${aggregate.totalSpend.toLocaleString()}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-5 pb-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Revenue</span>
                          <Target className="h-4 w-4 text-primary" />
                        </div>
                        <p className="text-2xl font-bold">${aggregate.totalRevenue.toLocaleString()}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-5 pb-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">CPL</span>
                          <MousePointerClick className="h-4 w-4 text-primary" />
                        </div>
                        <p className="text-2xl font-bold">${aggregate.avgCpl}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Secondary KPIs */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <Card>
                      <CardContent className="pt-4 pb-3">
                        <span className="text-xs text-muted-foreground">CTR</span>
                        <p className="text-lg font-semibold">{aggregate.avgCtr}%</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 pb-3">
                        <span className="text-xs text-muted-foreground">CPC</span>
                        <p className="text-lg font-semibold">${aggregate.avgCpc}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 pb-3">
                        <span className="text-xs text-muted-foreground">Conversions</span>
                        <p className="text-lg font-semibold">{aggregate.totalConversions}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 pb-3">
                        <span className="text-xs text-muted-foreground">Conv. Rate</span>
                        <p className="text-lg font-semibold">{aggregate.conversionRate}%</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Charts */}
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <Card>
                      <CardHeader><CardTitle className="text-base">Spend vs Revenue</CardTitle></CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart data={spendVsRevenue}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="Spend" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader><CardTitle className="text-base">Funnel</CardTitle></CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={280}>
                          <PieChart>
                            <Pie data={funnelData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value.toLocaleString()}`}>
                              {funnelData.map((_, i) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <Card>
                      <CardHeader><CardTitle className="text-base">ROAS by Campaign</CardTitle></CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={280}>
                          <AreaChart data={roasChart}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Area type="monotone" dataKey="ROAS" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.2)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Rule-Based Insights */}
                    <Card>
                      <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Automated Alerts</CardTitle></CardHeader>
                      <CardContent className="space-y-3">
                        {ruleInsights.length === 0 && <p className="text-sm text-muted-foreground">No alerts generated.</p>}
                        {ruleInsights.map((r, i) => (
                          <div key={i} className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                            r.type === "warning" ? "bg-destructive/10 text-destructive" :
                            r.type === "success" ? "bg-green-500/10 text-green-700" :
                            "bg-blue-500/10 text-blue-700"
                          }`}>
                            {r.type === "warning" ? <TrendingDown className="h-4 w-4 mt-0.5 shrink-0" /> :
                             r.type === "success" ? <TrendingUp className="h-4 w-4 mt-0.5 shrink-0" /> :
                             <Eye className="h-4 w-4 mt-0.5 shrink-0" />}
                            {r.message}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={runAI} disabled={analyzing}>
                      <Sparkles className="h-4 w-4 mr-1" /> {analyzing ? "Analyzing..." : "Generate AI Report"}
                    </Button>
                    <Button variant="outline" onClick={exportCSV}>
                      <Download className="h-4 w-4 mr-1" /> Export CSV
                    </Button>
                    <Button variant="outline" onClick={exportPNG}>
                      <Image className="h-4 w-4 mr-1" /> Export PNG
                    </Button>
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          {/* AI REPORT TAB */}
          <TabsContent value="report">
            {analysis && (
              <div className="space-y-6">
                {/* Risk Badge */}
                <div className="flex items-center gap-3">
                  <Badge variant={analysis.riskLevel === "Low" ? "default" : analysis.riskLevel === "High" ? "destructive" : "secondary"} className="text-sm px-3 py-1">
                    Risk Level: {analysis.riskLevel}
                  </Badge>
                </div>

                {/* Executive Summary */}
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Executive Summary</CardTitle></CardHeader>
                  <CardContent><p className="text-sm leading-relaxed whitespace-pre-line">{analysis.executiveSummary}</p></CardContent>
                </Card>

                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader><CardTitle className="text-base">Key Insights</CardTitle></CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analysis.keyInsights.map((ins, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Sparkles className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                            {ins}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-base">Bottlenecks</CardTitle></CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analysis.bottlenecks.map((b, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
                            {b}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                {/* Risk Analysis */}
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Risk Analysis</CardTitle></CardHeader>
                  <CardContent><p className="text-sm leading-relaxed">{analysis.riskAnalysis}</p></CardContent>
                </Card>

                {/* Budget Recommendations */}
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-5 w-5" /> Budget Recommendations</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.budgetRecommendations.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <TrendingUp className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Scaling Strategy */}
                <Card>
                  <CardHeader><CardTitle className="text-base">Scaling Strategy</CardTitle></CardHeader>
                  <CardContent><p className="text-sm leading-relaxed">{analysis.scalingStrategy}</p></CardContent>
                </Card>

                {/* Export */}
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-1" /> CSV</Button>
                  <Button variant="outline" onClick={exportPNG}><Image className="h-4 w-4 mr-1" /> PNG</Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* BUDGET ALLOCATION TAB */}
          <TabsContent value="budget">
            <BudgetAllocation />
          </TabsContent>

          {/* PROFIT ANALYZER TAB */}
          <TabsContent value="profit">
            <ProfitAnalyzer />
          </TabsContent>

          {/* AI PREDICTIONS TAB */}
          <TabsContent value="predictions">
            <AIPredictionEngine />
          </TabsContent>

          {/* FUNNEL LEAK DETECTOR TAB */}
          <TabsContent value="funnel-leak">
            <FunnelLeakDetector />
          </TabsContent>

          {/* FUNNEL OPTIMIZER TAB */}
          <TabsContent value="funnel-optimize">
            <FunnelOptimizer />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminAdsIntelligence;
