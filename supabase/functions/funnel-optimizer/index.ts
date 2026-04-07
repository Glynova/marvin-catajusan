import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { ads } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const adSummary = ads
      .slice(0, 20)
      .map(
        (a: Record<string, unknown>, i: number) =>
          `Ad ${i + 1} (id:${a.id}): "${a.name}" | Impressions=${a.impressions}, Clicks=${a.clicks}, AddToCart=${a.add_to_cart}, Checkout=${a.initiate_checkout}, Purchases=${a.purchases}, Spend=$${a.spend}, Revenue=$${a.revenue}, CTR=${a.ctr}%, ROAS=${a.roas}`
      )
      .join("\n");

    const prompt = `Analyze these ad funnels and provide optimization recommendations. For each ad, identify the weakest funnel stage and provide actionable suggestions.

AD FUNNEL DATA:
${adSummary}

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "optimizations": [
    {
      "adId": "ad-uuid",
      "adName": "Creative Name",
      "weakestStage": "Clicks to Add to Cart",
      "currentRate": 12.5,
      "targetRate": 25.0,
      "suggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"],
      "impact": "high",
      "estimatedRevenueGain": 500
    }
  ]
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
            content: "You are a conversion rate optimization expert. Provide specific, actionable funnel improvement suggestions. Always respond with valid JSON only.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Funnel optimization failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let result;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      result = JSON.parse(jsonMatch[1].trim());
    } catch {
      result = { optimizations: [] };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("funnel-optimizer error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
