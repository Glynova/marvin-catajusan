import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VERIFY_TOKEN = "glynova_fb_verify_2024";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // GET: Facebook webhook verification
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Facebook webhook verified");
      return new Response(challenge, { status: 200, headers: corsHeaders });
    }
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  // POST: Receive messages from Messenger
  if (req.method === "POST") {
    try {
      const body = await req.json();
      if (body.object !== "page") {
        return new Response("Not Found", { status: 404, headers: corsHeaders });
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Fetch chatbot config once for all messages
      const { data: botConfig } = await supabase
        .from("chatbot_config")
        .select("persona, trigger_words, settings, active_channels")
        .limit(1)
        .maybeSingle();

      const triggerWords: string[] = Array.isArray(botConfig?.trigger_words)
        ? (botConfig.trigger_words as string[]).map((w: string) => w.toLowerCase().trim())
        : [];
      const settings = (botConfig?.settings as Record<string, boolean>) || {};
      const activeChannels = (botConfig?.active_channels as Record<string, boolean>) || {};
      const isFBActive = activeChannels.facebook !== false; // default true
      const systemPrompt = botConfig?.persona ||
        "You are GLYNOVA's friendly AI assistant on Facebook Messenger. Help potential clients learn about digital marketing services. Keep replies short (2-3 sentences), warm, and professional. Always encourage booking a consultation.";

      for (const entry of body.entry || []) {
        for (const event of entry.messaging || []) {
          if (!event.message?.text) continue;

          const senderId = event.sender.id;
          const messageText = event.message.text;
          const messageLower = messageText.toLowerCase();

          console.log(`Message from ${senderId}: ${messageText}`);

          // Upsert conversation
          const { data: existingConvo } = await supabase
            .from("conversations")
            .select("id")
            .eq("sender_id", senderId)
            .eq("platform", "facebook")
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
                sender_name: `FB User ${senderId}`,
                platform: "facebook",
                last_message: messageText,
                unread: true,
              })
              .select("id")
              .single();
            convoId = newConvo!.id;
          }

          // Insert incoming message
          await supabase.from("messages").insert({
            conversation_id: convoId,
            sender: "client",
            message_text: messageText,
            platform: "facebook",
          });

          // Lead capture (auto-capture if enabled, default true)
          if (settings.autoCaptureLead !== false) {
            // Check if lead already exists for this sender
            const { data: existingLead } = await supabase
              .from("leads")
              .select("id")
              .eq("email", `${senderId}@facebook.messenger`)
              .maybeSingle();

            if (!existingLead) {
              await supabase.from("leads").insert({
                name: `FB User ${senderId}`,
                email: `${senderId}@facebook.messenger`,
                message: messageText,
                business_name: "Facebook Messenger",
                status: "New",
              });
            }
          }

          // Check trigger words — if trigger words are set, only reply when matched
          // If no trigger words configured, reply to all messages
          let shouldReply = triggerWords.length === 0;
          if (!shouldReply) {
            shouldReply = triggerWords.some((tw) => messageLower.includes(tw));
          }

          if (!shouldReply || !isFBActive) {
            console.log(`Skipping reply: triggerMatch=${shouldReply}, fbActive=${isFBActive}`);
            continue;
          }

          // Get page access token
          const { data: fbConn } = await supabase
            .from("social_connections")
            .select("access_token, page_id")
            .eq("platform", "facebook")
            .single();

          if (!fbConn?.access_token) {
            console.log("No Facebook access token configured, skipping reply");
            continue;
          }

          let replyText = "Hi! Thanks for reaching out. How can we help you today? 🙌";

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
                      { role: "user", content: messageText },
                    ],
                  }),
                }
              );

              if (aiRes.ok) {
                const aiData = await aiRes.json();
                replyText = aiData.choices?.[0]?.message?.content || replyText;
              } else {
                console.error("AI gateway error:", aiRes.status);
              }
            }
          } catch (aiErr) {
            console.error("AI reply error:", aiErr);
          }

          // Store bot reply in messages
          await supabase.from("messages").insert({
            conversation_id: convoId,
            sender: "admin",
            message_text: replyText,
            platform: "facebook",
          });

          await supabase.from("conversations").update({
            last_message: replyText,
            updated_at: new Date().toISOString(),
          }).eq("id", convoId);

          // Send reply via Facebook Graph API
          try {
            const fbRes = await fetch(
              `https://graph.facebook.com/v18.0/me/messages?access_token=${fbConn.access_token}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  recipient: { id: senderId },
                  message: { text: replyText },
                }),
              }
            );
            if (!fbRes.ok) {
              const errData = await fbRes.json();
              console.error("FB send error:", errData);
            } else {
              console.log("Reply sent to", senderId);
            }
          } catch (fbErr) {
            console.error("FB send fetch error:", fbErr);
          }
        }
      }

      return new Response("EVENT_RECEIVED", { status: 200, headers: corsHeaders });
    } catch (err) {
      console.error("Webhook error:", err);
      return new Response(JSON.stringify({ error: "Internal error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});
