import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { metrics, campaigns } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const campaignSummary = campaigns
      .slice(0, 20)
      .map(
        (c: Record<string, unknown>, i: number) =>
          `Campaign ${i + 1}: Impressions=${c.impressions}, Clicks=${c.clicks}, Spend=$${c.spend}, Conversions=${c.conversions}, Revenue=$${c.revenue}`
      )
      .join("\n");

    const prompt = `Act as a senior performance marketing strategist. Analyze this ad campaign data and provide a client-ready analysis.

AGGREGATE METRICS:
- Total Spend: $${metrics.totalSpend}
- Total Revenue: $${metrics.totalRevenue}
- Overall ROAS: ${metrics.roas}
- Average CTR: ${metrics.avgCtr}%
- Average CPC: $${metrics.avgCpc}
- Average CPL: $${metrics.avgCpl}
- Total Conversions: ${metrics.totalConversions}
- Conversion Rate: ${metrics.conversionRate}%

CAMPAIGN DATA:
${campaignSummary}

Respond with ONLY valid JSON (no markdown, no code fences) in this exact structure:
{
  "executiveSummary": "2-3 paragraph executive summary",
  "keyInsights": ["insight1", "insight2", "insight3", "insight4", "insight5"],
  "bottlenecks": ["bottleneck1", "bottleneck2", "bottleneck3"],
  "riskLevel": "Low" or "Medium" or "High",
  "riskAnalysis": "Detailed risk analysis paragraph",
  "budgetRecommendations": ["recommendation1", "recommendation2", "recommendation3"],
  "scalingStrategy": "Paragraph about budget scaling strategy"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are a senior performance marketing strategist. Be concise, authoritative, and client-ready. Always respond with valid JSON only.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse the JSON from the AI response
    let analysis;
    try {
      // Try to extract JSON if wrapped in code fences
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      analysis = JSON.parse(jsonMatch[1].trim());
    } catch {
      analysis = {
        executiveSummary: content,
        keyInsights: ["AI analysis returned unstructured data"],
        bottlenecks: [],
        riskLevel: "Medium",
        riskAnalysis: "Unable to parse structured analysis",
        budgetRecommendations: [],
        scalingStrategy: "",
      };
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ads-analysis error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
