import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign, TrendingUp, TrendingDown, Percent, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";

interface AdRow {
  id: string;
  creative_name: string;
  spend: number;
  revenue: number;
  cost_of_goods: number;
  profit: number;
  margin: number;
  phase: string;
  status: string;
}

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function ProfitAnalyzer() {
  const [ads, setAds] = useState<AdRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("budget_ads").select("*").order("created_at", { ascending: false });
      if (data) {
        const mapped = (data as any[]).map(a => ({
          ...a,
          profit: a.revenue - a.spend - (a.cost_of_goods || 0),
          margin: a.revenue > 0 ? ((a.revenue - a.spend - (a.cost_of_goods || 0)) / a.revenue) * 100 : 0,
        }));
        setAds(mapped);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-40 text-muted-foreground">Loading...</div>;
  if (ads.length === 0) return (
    <Card><CardContent className="py-12 text-center text-muted-foreground">No ad data available. Add ads in the Budget Allocation tab first.</CardContent></Card>
  );

  const totalRevenue = ads.reduce((s, a) => s + a.revenue, 0);
  const totalSpend = ads.reduce((s, a) => s + a.spend, 0);
  const totalCogs = ads.reduce((s, a) => s + (a.cost_of_goods || 0), 0);
  const totalProfit = totalRevenue - totalSpend - totalCogs;
  const totalMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  const profitableAds = ads.filter(a => a.profit > 0);
  const losingAds = ads.filter(a => a.profit <= 0);

  const chartData = ads.map(a => ({
    name: a.creative_name.substring(0, 14),
    Revenue: a.revenue,
    Spend: a.spend,
    Profit: a.profit,
  }));

  const marginData = ads.map(a => ({
    name: a.creative_name.substring(0, 14),
    Margin: parseFloat(a.margin.toFixed(1)),
  }));

  const breakdownData = [
    { name: "Ad Spend", value: totalSpend, fill: "#ef4444" },
    { name: "Cost of Goods", value: totalCogs, fill: "#f59e0b" },
    { name: "Profit", value: Math.max(0, totalProfit), fill: "#10b981" },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Revenue</span>
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <p className="text-xl font-bold">${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Total Cost</span>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </div>
            <p className="text-xl font-bold">${(totalSpend + totalCogs).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Net Profit</span>
              {totalProfit >= 0 ? <ArrowUpRight className="h-4 w-4 text-green-500" /> : <ArrowDownRight className="h-4 w-4 text-destructive" />}
            </div>
            <p className={`text-xl font-bold ${totalProfit >= 0 ? "text-green-600" : "text-destructive"}`}>
              ${totalProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Margin</span>
              <Percent className="h-4 w-4 text-primary" />
            </div>
            <p className={`text-xl font-bold ${totalMargin >= 0 ? "text-green-600" : "text-destructive"}`}>
              {totalMargin.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">ROAS</span>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <p className="text-xl font-bold">{roas.toFixed(2)}x</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Revenue vs Spend vs Profit</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="Revenue" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Spend" fill="#ef4444" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Profit" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Cost Breakdown</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={breakdownData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value"
                  label={({ name, value }) => `${name}: $${value.toLocaleString()}`}>
                  {breakdownData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Margin Trend */}
      <Card>
        <CardHeader><CardTitle className="text-base">Profit Margin by Ad (%)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={marginData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Area type="monotone" dataKey="Margin" stroke="#10b981" fill="#10b981" fillOpacity={0.15} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Ad Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ad Profitability Breakdown</CardTitle>
          <CardDescription>{profitableAds.length} profitable / {losingAds.length} losing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 px-2 font-medium">Creative</th>
                  <th className="text-right py-2 px-2 font-medium">Revenue</th>
                  <th className="text-right py-2 px-2 font-medium">Ad Spend</th>
                  <th className="text-right py-2 px-2 font-medium">COGS</th>
                  <th className="text-right py-2 px-2 font-medium">Profit</th>
                  <th className="text-right py-2 px-2 font-medium">Margin</th>
                  <th className="text-center py-2 px-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {ads.map(a => (
                  <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-2 px-2 font-medium">{a.creative_name}</td>
                    <td className="text-right py-2 px-2">${a.revenue.toLocaleString()}</td>
                    <td className="text-right py-2 px-2">${a.spend.toLocaleString()}</td>
                    <td className="text-right py-2 px-2">${(a.cost_of_goods || 0).toLocaleString()}</td>
                    <td className={`text-right py-2 px-2 font-semibold ${a.profit >= 0 ? "text-green-600" : "text-destructive"}`}>
                      ${a.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className="text-right py-2 px-2">
                      <Badge variant={a.margin >= 20 ? "default" : a.margin >= 0 ? "secondary" : "destructive"}>
                        {a.margin.toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="text-center py-2 px-2">
                      <Badge variant={a.profit > 0 ? "default" : "destructive"}>
                        {a.profit > 0 ? "Profitable" : "Losing"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
