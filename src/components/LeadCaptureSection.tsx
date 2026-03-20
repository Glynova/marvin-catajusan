import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, CheckCircle2, Clock, Gift, Zap, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

const benefits = [
  { icon: Zap, text: "Full marketing audit of your current setup" },
  { icon: Gift, text: "Custom growth roadmap tailored to your business" },
  { icon: Clock, text: "30-minute 1-on-1 strategy session" },
];

const LeadCaptureSection = () => {
  const [submitted, setSubmitted] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = formData.get("name") as string;
    const business = formData.get("business") as string;
    const challenge = formData.get("challenge") as string;

    setSubmitted(true);
    setLoadingAi(true);
    toast({ title: "Request received!", description: "Generating your personalized insights…" });

    try {
      const { data, error } = await supabase.functions.invoke("lead-response", {
        body: { name, business, challenge },
      });

      if (error) throw error;
      setAiResponse(data?.response || "Thanks for reaching out! Marvin will be in touch within 24 hours.");
    } catch (err) {
      console.error("AI response error:", err);
      setAiResponse("Thanks for reaching out! Marvin will review your info and get back to you within 24 hours with personalized insights for your business.");
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <section id="contact" className="section-padding border-t border-border relative overflow-hidden">
      <div className="absolute inset-0" style={{ backgroundImage: "var(--gradient-hero)" }} />
      <div className="section-container relative z-10">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-primary text-sm font-medium uppercase tracking-widest">Limited Spots</span>
            <h2 className="font-heading text-3xl lg:text-4xl font-bold mt-3 mb-4">
              Get Your <span className="gradient-text">Free Growth Audit</span>
            </h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              I only take on 5 new clients per month to ensure every business gets my full attention. Book your free strategy session now — no obligation, just pure value.
            </p>

            <div className="space-y-4 mb-8">
              {benefits.map((b) => (
                <div key={b.text} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <b.icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm text-foreground">{b.text}</span>
                </div>
              ))}
            </div>

            <div className="card-glass p-4 inline-flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm text-foreground font-medium">Only 3 spots left this month</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            {submitted ? (
              <div className="card-glass p-8 text-center space-y-4">
                <CheckCircle2 className="h-14 w-14 text-primary mx-auto" />
                <h3 className="font-heading text-2xl font-bold">You're In!</h3>

                {loadingAi ? (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Generating personalized insights…</span>
                  </div>
                ) : (
                  <div className="text-left bg-primary/5 border border-primary/10 rounded-xl p-5 mt-2">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="h-4 w-4 text-accent" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-accent">AI-Powered Insight</span>
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 leading-relaxed [&>p]:mb-2 [&>p:last-child]:mb-0">
                      <ReactMarkdown>{aiResponse}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="card-glass p-8 space-y-4">
                <h3 className="font-heading text-xl font-bold mb-2">Book Your Free Strategy Call</h3>
                <p className="text-sm text-muted-foreground mb-4">Fill in your details and I'll reach out within 24 hours.</p>
                <Input name="name" placeholder="Your Name" required className="bg-secondary border-border" />
                <Input name="email" placeholder="Email Address" type="email" required className="bg-secondary border-border" />
                <Input name="business" placeholder="Business Name" className="bg-secondary border-border" />
                <Input name="website" placeholder="Website URL (optional)" className="bg-secondary border-border" />
                <Textarea name="challenge" placeholder="What's your biggest marketing challenge?" rows={3} className="bg-secondary border-border" />
                <Button variant="hero" size="lg" className="w-full" type="submit">
                  Claim Your Free Audit <ArrowRight className="ml-1" />
                </Button>
                <p className="text-xs text-muted-foreground text-center">No spam. No obligation. 100% free.</p>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default LeadCaptureSection;
