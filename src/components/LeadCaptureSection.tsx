import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, CheckCircle2, Clock, Gift, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const benefits = [
  { icon: Zap, text: "Full marketing audit of your current setup" },
  { icon: Gift, text: "Custom growth roadmap tailored to your business" },
  { icon: Clock, text: "30-minute 1-on-1 strategy session" },
];

const LeadCaptureSection = () => {
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
    toast({ title: "Request received!", description: "I'll be in touch within 24 hours." });
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
              <div className="card-glass p-12 text-center">
                <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" />
                <h3 className="font-heading text-2xl font-bold mb-2">You're In!</h3>
                <p className="text-muted-foreground">I'll review your info and reach out within 24 hours with your personalized growth audit.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="card-glass p-8 space-y-4">
                <h3 className="font-heading text-xl font-bold mb-2">Book Your Free Strategy Call</h3>
                <p className="text-sm text-muted-foreground mb-4">Fill in your details and I'll reach out within 24 hours.</p>
                <Input placeholder="Your Name" required className="bg-secondary border-border" />
                <Input placeholder="Email Address" type="email" required className="bg-secondary border-border" />
                <Input placeholder="Business Name" className="bg-secondary border-border" />
                <Input placeholder="Website URL (optional)" className="bg-secondary border-border" />
                <Textarea placeholder="What's your biggest marketing challenge?" rows={3} className="bg-secondary border-border" />
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
