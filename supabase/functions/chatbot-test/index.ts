import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const testMessage = body.message || "Hello, I need help with marketing services";
    const platform = body.platform || "facebook";

    // Fetch chatbot config
    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: botConfig } = await serviceClient
      .from("chatbot_config")
      .select("persona, trigger_words, settings")
      .limit(1)
      .maybeSingle();

    const triggerWords: string[] = Array.isArray(botConfig?.trigger_words)
      ? (botConfig.trigger_words as string[]).map((w: string) => w.toLowerCase().trim())
      : [];
    const systemPrompt = botConfig?.persona ||
      "You are GLYNOVA's friendly AI assistant. Help potential clients learn about digital marketing services. Keep replies short (2-3 sentences), warm, and professional.";

    // Check trigger words
    const messageLower = testMessage.toLowerCase();
    let triggerMatched = triggerWords.length === 0;
    let matchedWord = "";
    if (!triggerMatched) {
      for (const tw of triggerWords) {
        if (messageLower.includes(tw)) {
          triggerMatched = true;
          matchedWord = tw;
          break;
        }
      }
    }

    let replyText = "Hi! Thanks for reaching out. How can we help you today? 🙌";
    let aiUsed = false;

    if (triggerMatched) {
      try {
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (LOVABLE_API_KEY) {
          const aiRes = await fetch(
            "https://ai.gateway.lovable.dev/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: testMessage },
                ],
              }),
            }
          );

          if (aiRes.ok) {
            const aiData = await aiRes.json();
            replyText = aiData.choices?.[0]?.message?.content || replyText;
            aiUsed = true;
          }
        }
      } catch (aiErr) {
        console.error("AI test error:", aiErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        test_message: testMessage,
        platform,
        trigger_matched: triggerMatched,
        matched_word: matchedWord || (triggerWords.length === 0 ? "(all messages)" : "none"),
        trigger_words_configured: triggerWords,
        ai_used: aiUsed,
        bot_reply: replyText,
        persona_preview: systemPrompt.slice(0, 100) + "...",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Chatbot test error:", err);
    return new Response(JSON.stringify({ error: "Test failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
