import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function cleanReplyText(text: string): string {
  return text
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/__/g, "")
    .replace(/#{1,6}\s?/g, "")
    .replace(/`/g, "")
    .replace(/^\s*[-•]\s*/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: waConn } = await supabase.from("social_connections")
      .select("webhook_url").eq("platform", "whatsapp").maybeSingle();
    const verifyToken = waConn?.webhook_url || "glynova_wa_verify_2024";

    if (mode === "subscribe" && token === verifyToken) {
      console.log("WhatsApp webhook verified");
      return new Response(challenge, { status: 200, headers: corsHeaders });
    }
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  if (req.method === "POST") {
    try {
      const body = await req.json();

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value?.messages) {
        return new Response("EVENT_RECEIVED", { status: 200, headers: corsHeaders });
      }

      for (const message of value.messages) {
        if (message.type !== "text") continue;

        const messageId = message.id;
        const senderId = message.from;
        const messageText = message.text?.body || "";
        const senderName = value.contacts?.[0]?.profile?.name || `WA User ${senderId}`;

        // Deduplicate
        if (messageId) {
          const { data: existing } = await supabase
            .from("processed_messages").select("id").eq("message_id", messageId).maybeSingle();
          if (existing) {
            console.log(`Duplicate WA message ${messageId}, skipping`);
            continue;
          }
          await supabase.from("processed_messages").insert({ message_id: messageId, platform: "whatsapp" });
        }

        console.log(`WhatsApp from ${senderName} (${senderId}) [${messageId}]: ${messageText}`);

        // Upsert conversation
        const { data: existingConvo } = await supabase.from("conversations")
          .select("id").eq("sender_id", senderId).eq("platform", "whatsapp").maybeSingle();

        let convoId: string;
        if (existingConvo) {
          convoId = existingConvo.id;
          await supabase.from("conversations").update({
            last_message: messageText, sender_name: senderName, unread: true, updated_at: new Date().toISOString(),
          }).eq("id", convoId);
        } else {
          const { data: newConvo } = await supabase.from("conversations").insert({
            sender_id: senderId, sender_name: senderName, platform: "whatsapp",
            last_message: messageText, unread: true,
          }).select("id").single();
          convoId = newConvo!.id;
        }

        await supabase.from("messages").insert({
          conversation_id: convoId, sender: "client", message_text: messageText, platform: "whatsapp",
        });

        // Lead capture (deduplicated)
        const { data: existingLead } = await supabase.from("leads").select("id").eq("email", `${senderId}@whatsapp.user`).maybeSingle();
        if (!existingLead) {
          await supabase.from("leads").insert({
            name: senderName, email: `${senderId}@whatsapp.user`,
            message: messageText, business_name: "WhatsApp", status: "New",
          });
        }

        // AI auto-reply
        const { data: waConn } = await supabase.from("social_connections")
          .select("access_token, api_key").eq("platform", "whatsapp").maybeSingle();

        if (!waConn?.access_token) continue;

        let replyText = "Thanks for your message! We'll get back to you shortly.";

        try {
          const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
          if (LOVABLE_API_KEY) {
            const { data: botConfig } = await supabase.from("chatbot_config").select("persona").limit(1).maybeSingle();
            const basePrompt = botConfig?.persona || "You are GLYNOVA's friendly AI assistant on WhatsApp.";
            const systemPrompt = basePrompt + " Reply in simple plain text only. Do not use markdown, bold text, bullet points, headers, asterisks, or code formatting. Keep the reply clean, short (2-3 sentences), and human-like.";

            const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [{ role: "system", content: systemPrompt }, { role: "user", content: messageText }],
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

        const finalReply = cleanReplyText(replyText);

        await supabase.from("messages").insert({ conversation_id: convoId, sender: "admin", message_text: finalReply, platform: "whatsapp" });
        await supabase.from("conversations").update({ last_message: finalReply, updated_at: new Date().toISOString() }).eq("id", convoId);

        const phoneNumberId = waConn.api_key;
        try {
          const waRes = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
            method: "POST",
            headers: { Authorization: `Bearer ${waConn.access_token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              messaging_product: "whatsapp", to: senderId, type: "text", text: { body: finalReply },
            }),
          });
          if (!waRes.ok) console.error("WA send error:", await waRes.json());
          else console.log("WA reply sent to", senderId);
        } catch (waErr) {
          console.error("WA send fetch error:", waErr);
        }
      }

      return new Response("EVENT_RECEIVED", { status: 200, headers: corsHeaders });
    } catch (err) {
      console.error("WhatsApp webhook error:", err);
      return new Response(JSON.stringify({ error: "Internal error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});
