import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Brain, Sparkles, TrendingUp, TrendingDown, Target, AlertTriangle,
  RefreshCw, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";

interface AdWithPrediction {
  id: string;
  creative_name: string;
  spend: number;
  revenue: number;
  cost_of_goods: number;
  roas: number;
  ctr: number;
  conversions: number;
  phase: string;
  profit: number;
  margin: number;
  predicted_roas: number;
  predicted_profit: number;
  predicted_margin: number;
  confidence_score: number;
  recommendation: string;
}

export default function AIPredictionEngine() {
  const { toast } = useToast();
  const [ads, setAds] = useState<AdWithPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);

  const loadAds = async () => {
    setLoading(true);
    const { data } = await supabase.from("budget_ads").select("*").order("created_at", { ascending: false });
    if (data) {
      setAds((data as any[]).map(a => ({
        ...a,
        profit: a.revenue - a.spend - (a.cost_of_goods || 0),
        margin: a.revenue > 0 ? ((a.revenue - a.spend - (a.cost_of_goods || 0)) / a.revenue) * 100 : 0,
      })));
    }
    setLoading(false);
  };

  useEffect(() => { loadAds(); }, []);

  const runPredictions = async () => {
    if (ads.length === 0) return;
    setPredicting(true);
    try {
      const adSummary = ads.map(a => ({
        id: a.id,
        name: a.creative_name,
        spend: a.spend,
        revenue: a.revenue,
        cogs: a.cost_of_goods,
        roas: a.roas,
        ctr: a.ctr,
        conversions: a.conversions,
        phase: a.phase,
        profit: a.profit,
        margin: a.margin,
      }));

      const { data, error } = await supabase.functions.invoke("ads-predictions", {
        body: { ads: adSummary },
      });

      if (error) throw error;

      const predictions = data.predictions as Array<{
        id: string; predicted_roas: number; predicted_profit: number;
        predicted_margin: number; confidence_score: number; recommendation: string;
      }>;

      const updated = ads.map(ad => {
        const pred = predictions.find(p => p.id === ad.id);
        if (pred) {
          return {
            ...ad,
            predicted_roas: pred.predicted_roas,
            predicted_profit: pred.predicted_profit,
            predicted_margin: pred.predicted_margin,
            confidence_score: pred.confidence_score,
            recommendation: pred.recommendation,
          };
        }
        return ad;
      });

      // Persist predictions
      for (const pred of predictions) {
        await supabase.from("budget_ads").update({
          predicted_roas: pred.predicted_roas,
          predicted_profit: pred.predicted_profit,
          predicted_margin: pred.predicted_margin,
          confidence_score: pred.confidence_score,
          recommendation: pred.recommendation,
        }).eq("id", pred.id);
      }

      setAds(updated);
      toast({ title: "AI Predictions Complete", description: `${predictions.length} ads analyzed.` });
    } catch (err: unknown) {
      toast({ title: "Prediction Failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setPredicting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-40 text-muted-foreground">Loading...</div>;
  if (ads.length === 0) return (
    <Card><CardContent className="py-12 text-center text-muted-foreground">No ad data. Add ads in Budget Allocation first.</CardContent></Card>
  );

  const hasPredictions = ads.some(a => a.predicted_roas > 0 || a.confidence_score > 0);

  const comparisonData = ads.filter(a => a.predicted_roas > 0).map(a => ({
    name: a.creative_name.substring(0, 12),
    "Current ROAS": parseFloat(a.roas.toFixed(2)),
    "Predicted ROAS": parseFloat(a.predicted_roas.toFixed(2)),
  }));

  const confidenceData = ads.filter(a => a.confidence_score > 0).map(a => ({
    name: a.creative_name.substring(0, 12),
    Confidence: Math.round(a.confidence_score),
  }));

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 50) return "text-blue-600";
    return "text-destructive";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-lg font-bold font-heading">AI Prediction Engine</h2>
            <p className="text-sm text-muted-foreground">Forecast ad performance using AI analysis</p>
          </div>
        </div>
        <Button onClick={runPredictions} disabled={predicting}>
          {predicting ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
          {predicting ? "Analyzing..." : "Run AI Predictions"}
        </Button>
      </div>

      {!hasPredictions ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Predictions Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Click "Run AI Predictions" to forecast ROAS, profit, and margin for your ads.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Current vs Predicted ROAS</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Current ROAS" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Predicted ROAS" fill="#10b981" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Confidence Score Distribution</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={confidenceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => `${v}%`} />
                    <Bar dataKey="Confidence" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Predictions Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Target className="h-5 w-5" /> Prediction Results</CardTitle>
              <CardDescription>AI-generated forecasts for each ad creative</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 px-2 font-medium">Creative</th>
                      <th className="text-right py-2 px-2 font-medium">Current ROAS</th>
                      <th className="text-right py-2 px-2 font-medium">Pred. ROAS</th>
                      <th className="text-right py-2 px-2 font-medium">Pred. Profit</th>
                      <th className="text-right py-2 px-2 font-medium">Pred. Margin</th>
                      <th className="text-center py-2 px-2 font-medium">Confidence</th>
                      <th className="text-left py-2 px-2 font-medium">Recommendation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ads.filter(a => a.confidence_score > 0).map(a => (
                      <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2 px-2 font-medium">{a.creative_name}</td>
                        <td className="text-right py-2 px-2">{a.roas.toFixed(2)}x</td>
                        <td className="text-right py-2 px-2">
                          <span className="flex items-center justify-end gap-1">
                            {a.predicted_roas > a.roas ? <ArrowUpRight className="h-3 w-3 text-green-500" /> : <ArrowDownRight className="h-3 w-3 text-destructive" />}
                            {a.predicted_roas.toFixed(2)}x
                          </span>
                        </td>
                        <td className={`text-right py-2 px-2 font-semibold ${a.predicted_profit >= 0 ? "text-green-600" : "text-destructive"}`}>
                          ${a.predicted_profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td className="text-right py-2 px-2">{a.predicted_margin.toFixed(1)}%</td>
                        <td className="text-center py-2 px-2">
                          <div className="flex items-center gap-2 justify-center">
                            <Progress value={a.confidence_score} className="h-2 w-16" />
                            <span className={`text-xs font-bold ${getConfidenceColor(a.confidence_score)}`}>
                              {Math.round(a.confidence_score)}%
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-xs max-w-[200px]">{a.recommendation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
