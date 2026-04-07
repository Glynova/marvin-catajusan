import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles, Brain, RefreshCw, Target, TrendingUp, CheckCircle2,
  AlertTriangle, Zap, ArrowRight,
} from "lucide-react";

interface AdData {
  id: string;
  creative_name: string;
  impressions: number;
  clicks: number;
  add_to_cart: number;
  initiate_checkout: number;
  purchases: number;
  spend: number;
  revenue: number;
  ctr: number;
  roas: number;
  phase: string;
}

interface OptimizationResult {
  adId: string;
  adName: string;
  weakestStage: string;
  currentRate: number;
  targetRate: number;
  suggestions: string[];
  impact: "high" | "medium" | "low";
  estimatedRevenueGain: number;
}

export default function FunnelOptimizer() {
  const { toast } = useToast();
  const [ads, setAds] = useState<AdData[]>([]);
  const [results, setResults] = useState<OptimizationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("budget_ads").select("*").order("created_at", { ascending: false });
      if (data) setAds(data as any[]);
      setLoading(false);
    })();
  }, []);

  const runOptimization = async () => {
    if (ads.length === 0) return;
    setOptimizing(true);
    try {
      const adSummary = ads.map(a => ({
        id: a.id,
        name: a.creative_name,
        impressions: a.impressions || 0,
        clicks: a.clicks || 0,
        add_to_cart: a.add_to_cart || 0,
        initiate_checkout: a.initiate_checkout || 0,
        purchases: a.purchases || 0,
        spend: a.spend,
        revenue: a.revenue,
        ctr: a.ctr,
        roas: a.roas,
      }));

      const { data, error } = await supabase.functions.invoke("funnel-optimizer", {
        body: { ads: adSummary },
      });

      if (error) throw error;
      setResults(data.optimizations as OptimizationResult[]);
      toast({ title: "Funnel Optimization Complete", description: `${data.optimizations.length} recommendations generated.` });
    } catch (err: unknown) {
      toast({ title: "Optimization Failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setOptimizing(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-40 text-muted-foreground">Loading...</div>;
  if (ads.length === 0) return (
    <Card><CardContent className="py-12 text-center text-muted-foreground">No ad data. Add ads with funnel metrics first.</CardContent></Card>
  );

  const getImpactColor = (impact: string) => {
    if (impact === "high") return "bg-red-500/15 text-red-600";
    if (impact === "medium") return "bg-yellow-500/15 text-yellow-700";
    return "bg-green-500/15 text-green-600";
  };

  const totalEstimatedGain = results.reduce((s, r) => s + (r.estimatedRevenueGain || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-lg font-bold font-heading">Funnel Optimization Engine</h2>
            <p className="text-sm text-muted-foreground">AI-powered suggestions to fix funnel leaks and boost conversions</p>
          </div>
        </div>
        <Button onClick={runOptimization} disabled={optimizing}>
          {optimizing ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
          {optimizing ? "Optimizing..." : "Run Funnel Optimizer"}
        </Button>
      </div>

      {results.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Optimizations Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Click "Run Funnel Optimizer" to get AI-powered suggestions for improving your conversion funnel.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4 pb-3">
                <span className="text-xs text-muted-foreground uppercase">Recommendations</span>
                <p className="text-2xl font-bold">{results.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <span className="text-xs text-muted-foreground uppercase">High Impact</span>
                <p className="text-2xl font-bold text-destructive">{results.filter(r => r.impact === "high").length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <span className="text-xs text-muted-foreground uppercase">Est. Revenue Gain</span>
                <p className="text-2xl font-bold text-green-600">${totalEstimatedGain.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </CardContent>
            </Card>
          </div>

          {/* Optimization Cards */}
          <div className="space-y-4">
            {results.map((r, i) => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      {r.adName}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className={getImpactColor(r.impact)}>{r.impact.toUpperCase()} IMPACT</Badge>
                      {r.estimatedRevenueGain > 0 && (
                        <Badge variant="outline" className="text-green-600">
                          +${r.estimatedRevenueGain.toLocaleString()} potential
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Weakest Stage: {r.weakestStage}</p>
                      <p className="text-xs text-muted-foreground">
                        Current: {r.currentRate.toFixed(1)}% → Target: {r.targetRate.toFixed(1)}%
                      </p>
                    </div>
                    <Progress value={r.currentRate} className="h-2 w-20 ml-auto" />
                  </div>
                  <div className="space-y-2">
                    {r.suggestions.map((s, j) => (
                      <div key={j} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
