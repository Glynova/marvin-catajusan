import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VERIFY_TOKEN = "glynova_ig_verify_2024";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // GET: Instagram webhook verification
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Instagram webhook verified");
      return new Response(challenge, { status: 200, headers: corsHeaders });
    }
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  // POST: Receive messages from Instagram Messaging API
  if (req.method === "POST") {
    try {
      const body = await req.json();
      if (body.object !== "instagram") {
        return new Response("EVENT_RECEIVED", { status: 200, headers: corsHeaders });
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      for (const entry of body.entry || []) {
        for (const event of entry.messaging || []) {
          if (!event.message?.text) continue;

          const senderId = event.sender.id;
          const messageText = event.message.text;

          console.log(`Instagram message from ${senderId}: ${messageText}`);

          // Upsert conversation
          const { data: existingConvo } = await supabase
            .from("conversations")
            .select("id")
            .eq("sender_id", senderId)
            .eq("platform", "instagram")
            .maybeSingle();

          let convoId: string;

          if (existingConvo) {
            convoId = existingConvo.id;
            await supabase.from("conversations").update({
              last_message: messageText,
              unread: true,
              updated_at: new Date().toISOString(),
            }).eq("id", convoId);
          } else {
            const { data: newConvo } = await supabase
              .from("conversations")
              .insert({
                sender_id: senderId,
                sender_name: `IG User ${senderId}`,
                platform: "instagram",
                last_message: messageText,
                unread: true,
              })
              .select("id")
              .single();
            convoId = newConvo!.id;
          }

          // Insert message
          await supabase.from("messages").insert({
            conversation_id: convoId,
            sender: "client",
            message_text: messageText,
            platform: "instagram",
          });

          // Save as lead
          await supabase.from("leads").insert({
            name: `IG User ${senderId}`,
            email: `${senderId}@instagram.user`,
            message: messageText,
            business_name: "Instagram",
            status: "New",
          });

          // Get access token for IG
          const { data: igConn } = await supabase
            .from("social_connections")
            .select("access_token, page_id")
            .eq("platform", "instagram")
            .maybeSingle();

          if (igConn?.access_token) {
            let replyText = "Thanks for your message! We'll get back to you shortly. 🙌";

            try {
              const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
              if (LOVABLE_API_KEY) {
                let systemPrompt = "You are GLYNOVA's friendly AI assistant on Instagram. Help potential clients learn about digital marketing services. Keep replies short (2-3 sentences), warm, and professional.";

                const { data: botConfig } = await supabase
                  .from("chatbot_config")
                  .select("persona")
                  .limit(1)
                  .maybeSingle();
                if (botConfig?.persona) systemPrompt = botConfig.persona;

                const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${LOVABLE_API_KEY}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    model: "google/gemini-2.5-flash",
                    messages: [
                      { role: "system", content: systemPrompt },
                      { role: "user", content: messageText },
                    ],
                  }),
                });

                if (aiRes.ok) {
                  const aiData = await aiRes.json();
                  replyText = aiData.choices?.[0]?.message?.content || replyText;
                }
              }
            } catch (aiErr) {
              console.error("AI reply error:", aiErr);
            }

            // Store bot reply
            await supabase.from("messages").insert({
              conversation_id: convoId,
              sender: "admin",
              message_text: replyText,
              platform: "instagram",
            });

            await supabase.from("conversations").update({
              last_message: replyText,
              updated_at: new Date().toISOString(),
            }).eq("id", convoId);

            // Send reply via Instagram Graph API
            try {
              const igRes = await fetch(
                `https://graph.facebook.com/v18.0/me/messages?access_token=${igConn.access_token}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    recipient: { id: senderId },
                    message: { text: replyText },
                  }),
                }
              );
              if (!igRes.ok) {
                const errData = await igRes.json();
                console.error("IG send error:", errData);
              }
            } catch (igErr) {
              console.error("IG send fetch error:", igErr);
            }
          }
        }
      }

      return new Response("EVENT_RECEIVED", { status: 200, headers: corsHeaders });
    } catch (err) {
      console.error("Instagram webhook error:", err);
      return new Response(JSON.stringify({ error: "Internal error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});
