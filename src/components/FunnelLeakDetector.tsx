import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle, TrendingDown, ArrowDown, Eye, MousePointerClick, ShoppingCart,
  CreditCard, Package,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";

interface AdFunnel {
  id: string;
  creative_name: string;
  impressions: number;
  clicks: number;
  add_to_cart: number;
  initiate_checkout: number;
  purchases: number;
  spend: number;
  revenue: number;
}

interface LeakPoint {
  stage: string;
  from: string;
  to: string;
  fromValue: number;
  toValue: number;
  dropRate: number;
  severity: "critical" | "warning" | "healthy";
  icon: React.ReactNode;
}

export default function FunnelLeakDetector() {
  const [ads, setAds] = useState<AdFunnel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("budget_ads").select("*").order("created_at", { ascending: false });
      if (data) setAds(data as any[]);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-40 text-muted-foreground">Loading...</div>;
  if (ads.length === 0) return (
    <Card><CardContent className="py-12 text-center text-muted-foreground">No ad data. Add ads with funnel metrics first.</CardContent></Card>
  );

  // Aggregate funnel
  const totals = ads.reduce((s, a) => ({
    impressions: s.impressions + (a.impressions || 0),
    clicks: s.clicks + (a.clicks || 0),
    add_to_cart: s.add_to_cart + (a.add_to_cart || 0),
    initiate_checkout: s.initiate_checkout + (a.initiate_checkout || 0),
    purchases: s.purchases + (a.purchases || 0),
  }), { impressions: 0, clicks: 0, add_to_cart: 0, initiate_checkout: 0, purchases: 0 });

  const funnelStages = [
    { name: "Impressions", value: totals.impressions, icon: <Eye className="h-5 w-5" /> },
    { name: "Clicks", value: totals.clicks, icon: <MousePointerClick className="h-5 w-5" /> },
    { name: "Add to Cart", value: totals.add_to_cart, icon: <ShoppingCart className="h-5 w-5" /> },
    { name: "Checkout", value: totals.initiate_checkout, icon: <CreditCard className="h-5 w-5" /> },
    { name: "Purchases", value: totals.purchases, icon: <Package className="h-5 w-5" /> },
  ];

  const leaks: LeakPoint[] = [];
  for (let i = 0; i < funnelStages.length - 1; i++) {
    const from = funnelStages[i];
    const to = funnelStages[i + 1];
    const dropRate = from.value > 0 ? ((from.value - to.value) / from.value) * 100 : 0;
    leaks.push({
      stage: `${from.name} → ${to.name}`,
      from: from.name,
      to: to.name,
      fromValue: from.value,
      toValue: to.value,
      dropRate,
      severity: dropRate > 80 ? "critical" : dropRate > 50 ? "warning" : "healthy",
      icon: from.icon,
    });
  }

  const biggestLeak = leaks.reduce((max, l) => l.dropRate > max.dropRate ? l : max, leaks[0]);

  const funnelChartData = funnelStages.map(s => ({
    name: s.name,
    value: s.value,
  }));

  // Per-ad funnel comparison
  const adFunnelData = ads.filter(a => (a.impressions || 0) > 0).slice(0, 10).map(a => ({
    name: a.creative_name.substring(0, 12),
    "Click Rate": a.impressions > 0 ? ((a.clicks || 0) / a.impressions * 100) : 0,
    "Cart Rate": (a.clicks || 0) > 0 ? ((a.add_to_cart || 0) / a.clicks * 100) : 0,
    "Purchase Rate": (a.initiate_checkout || 0) > 0 ? ((a.purchases || 0) / a.initiate_checkout * 100) : 0,
  }));

  const getSeverityColor = (s: string) => {
    if (s === "critical") return "bg-red-500/15 text-red-600 border-red-500/30";
    if (s === "warning") return "bg-yellow-500/15 text-yellow-700 border-yellow-500/30";
    return "bg-green-500/15 text-green-600 border-green-500/30";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-lg font-bold font-heading">Funnel Leak Detector</h2>
          <p className="text-sm text-muted-foreground">Identify where prospects drop off in your conversion funnel</p>
        </div>
      </div>

      {/* Biggest Leak Alert */}
      {biggestLeak && biggestLeak.dropRate > 50 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <p className="font-semibold text-destructive">Biggest Leak Detected</p>
                <p className="text-sm text-muted-foreground">
                  {biggestLeak.stage} — {biggestLeak.dropRate.toFixed(1)}% drop-off ({biggestLeak.fromValue.toLocaleString()} → {biggestLeak.toValue.toLocaleString()})
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Funnel Visualization */}
      <Card>
        <CardHeader><CardTitle className="text-base">Conversion Funnel</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {funnelStages.map((stage, i) => {
              const maxVal = funnelStages[0].value || 1;
              const pct = (stage.value / maxVal) * 100;
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {stage.icon}
                      <span className="text-sm font-medium">{stage.name}</span>
                    </div>
                    <span className="text-sm font-bold">{stage.value.toLocaleString()}</span>
                  </div>
                  <Progress value={pct} className="h-3" />
                  {i < funnelStages.length - 1 && leaks[i] && (
                    <div className="flex items-center gap-1 ml-7 mt-1">
                      <ArrowDown className="h-3 w-3 text-muted-foreground" />
                      <span className={`text-xs font-medium ${leaks[i].severity === "critical" ? "text-destructive" : leaks[i].severity === "warning" ? "text-yellow-600" : "text-green-600"}`}>
                        -{leaks[i].dropRate.toFixed(1)}% drop
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Leak Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leak Analysis</CardTitle>
          <CardDescription>Drop-off rates between each funnel stage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {leaks.map((leak, i) => (
            <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${getSeverityColor(leak.severity)}`}>
              <div className="flex items-center gap-3">
                {leak.icon}
                <div>
                  <p className="text-sm font-medium">{leak.stage}</p>
                  <p className="text-xs opacity-75">{leak.fromValue.toLocaleString()} → {leak.toValue.toLocaleString()}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{leak.dropRate.toFixed(1)}%</p>
                <Badge variant={leak.severity === "healthy" ? "default" : "destructive"} className="text-xs">
                  {leak.severity.toUpperCase()}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Funnel Volume</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={funnelChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => v.toLocaleString()} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        {adFunnelData.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Per-Ad Conversion Rates (%)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={adFunnelData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                  <Bar dataKey="Click Rate" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Cart Rate" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Purchase Rate" fill="#10b981" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
