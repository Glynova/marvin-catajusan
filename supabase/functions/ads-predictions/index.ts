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
          `Ad ${i + 1} (id:${a.id}): "${a.name}" | Spend=$${a.spend}, Revenue=$${a.revenue}, COGS=$${a.cogs}, ROAS=${a.roas}, CTR=${a.ctr}%, Conversions=${a.conversions}, Phase=${a.phase}, Profit=$${a.profit}, Margin=${a.margin}%`
      )
      .join("\n");

    const prompt = `Analyze these ad campaigns and predict future performance. For each ad, predict:
- predicted_roas: expected ROAS in next period
- predicted_profit: expected profit in next period
- predicted_margin: expected margin % in next period
- confidence_score: 0-100 confidence in prediction
- recommendation: 1-2 sentence actionable recommendation

AD DATA:
${adSummary}

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "predictions": [
    {
      "id": "ad-uuid",
      "predicted_roas": 2.5,
      "predicted_profit": 500,
      "predicted_margin": 35.5,
      "confidence_score": 78,
      "recommendation": "Scale budget by 20%..."
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
            content: "You are a performance marketing AI analyst. Provide data-driven predictions. Always respond with valid JSON only.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI prediction failed" }), {
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
      result = { predictions: [] };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ads-predictions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
