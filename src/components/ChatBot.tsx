import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";
import { streamChat, type Msg } from "@/lib/stream-chat";

const QUICK_PROMPTS = [
  "Full-stack stack & apps",
  "CRM & business ops systems",
  "Paid media & ROAS tracking",
];

function buildLocalChatFallback(query: string): string {
  const q = query.toLowerCase();
  if (q.includes("stack") || q.includes("full-stack") || q.includes("react") || q.includes("next") || q.includes("app")) {
    return "Marvin builds production full-stack web apps using **React, Next.js, TypeScript, Node.js, and Supabase/PostgreSQL**—including multi-tenant portals, Stripe billing, and custom APIs. Share your project scope in the form below to schedule an architecture call.";
  }
  if (q.includes("ops") || q.includes("crm") || q.includes("erp") || q.includes("automation") || q.includes("webhook")) {
    return "For business operations, Marvin designs **custom CRM pipelines, lightweight ERP systems, AI qualification agents, and webhook automations** (n8n, Make, Node.js) that eliminate manual data entry and speed up lead response to under a minute.";
  }
  if (q.includes("paid") || q.includes("ads") || q.includes("roas") || q.includes("meta") || q.includes("google") || q.includes("tiktok")) {
    return "On paid media, Marvin manages **Meta, Google Search, and TikTok Ads** backed by server-side Conversion APIs, offline CRM attribution, and custom high-converting landing pages. Book a Technical & Growth Audit below to review your numbers.";
  }
  return "Marvin specializes in three connected areas: **Full-Stack Development** (React, Next.js, Node, Supabase), **Business Operation Systems** (CRM, ERP, AI agents & webhooks), and **Paid Media** (Meta, Google, TikTok). Use the **Start a Project** form below to share what you're building or scaling.";
}

const ChatBot = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hi! Ask me about Marvin's **Full-Stack Engineering**, **Business Operation Systems**, or **Paid Media** services.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendText = async (rawText: string) => {
    const text = rawText.trim();
    if (!text || loading) return;
    setInput("");

    const userMsg: Msg = { role: "user", content: text };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setLoading(true);

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && prev.length > nextHistory.length) {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: nextHistory,
        onDelta: upsert,
        onDone: () => setLoading(false),
        onError: () => {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: buildLocalChatFallback(text) },
          ]);
          setLoading(false);
        },
      });
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: buildLocalChatFallback(text) },
      ]);
      setLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-5 right-5 z-50 w-12 h-12 rounded-xl bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 flex items-center justify-center transition-colors"
            aria-label="Open assistant chat"
          >
            <MessageCircle className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-5 right-5 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[490px] max-h-[calc(100vh-4rem)] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-heading text-sm font-semibold text-foreground leading-none">
                    Glynova Assistant
                  </p>
                  <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                    Engineering · Ops · Paid Media
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-6 h-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[82%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}

              {messages.length === 1 && !loading && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {QUICK_PROMPTS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => sendText(q)}
                      className="text-xs px-2.5 py-1.5 rounded-md bg-secondary/80 border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors text-left"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {loading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex gap-2 items-center">
                  <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="bg-secondary rounded-xl px-3 py-2 text-xs text-muted-foreground">
                    Thinking…
                  </div>
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendText(input);
              }}
              className="flex gap-2 p-3 border-t border-border"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about apps, ops, or paid ads…"
                className="flex-1 bg-secondary/60 border-border text-sm"
                disabled={loading}
              />
              <Button
                type="submit"
                size="icon"
                disabled={loading || !input.trim()}
                className="shrink-0 bg-primary hover:bg-primary/90"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatBot;
