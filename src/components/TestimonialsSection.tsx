import { motion } from "framer-motion";
import { Quote } from "lucide-react";

const testimonials = [
  {
    name: "David Chen",
    role: "Founder, TechPulse SaaS",
    pillar: "Full-Stack + CRM Integration",
    outcome: "+487% SQL Demos in 4 Months",
    text: "Marvin rebuilt our marketing site in Next.js, wired our Supabase onboarding portal directly into our CRM, and restructured our Google Search campaigns. Demos went from 15 a month to 88 qualified calls.",
  },
  {
    name: "Maria Rodriguez",
    role: "Operations Director, Elite Home Services",
    pillar: "Business Ops + Paid Media",
    outcome: "38 hrs/wk Admin Eliminated",
    text: "Before working with Marvin, leads sat in spreadsheets and WhatsApp threads for hours. His automated dispatch CRM and local search funnels cut response time under a minute and booked us out 3 weeks ahead.",
  },
  {
    name: "Sarah Mitchell",
    role: "CEO, Bloom Skincare",
    pillar: "Paid Media + CRO Engineering",
    outcome: "4.8x Blended ROAS",
    text: "Implementing server-side Meta Conversion API tracking and custom React landing pages completely changed our unit economics. We scaled monthly revenue from $8.4K to over $65K profitably.",
  },
  {
    name: "James Patterson",
    role: "Managing Partner, Vertex Group",
    pillar: "AI Agents + Webhook Pipelines",
    outcome: "74% Qualified Call Rate",
    text: "Having one engineer who understands webhooks, AI qualification agents, and paid acquisition saved us months of vendor coordination. Every lead is scored, routed, and tracked automatically.",
  },
];

const TestimonialsSection = () => (
  <section id="testimonials" className="section-padding border-t border-border">
    <div className="section-container">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-2xl mb-12"
      >
        <p className="text-xs font-medium text-primary uppercase tracking-widest mb-3">
          Client Outcomes
        </p>
        <h2 className="font-heading text-3xl lg:text-4xl font-bold mb-4">
          Verified Across Code, <span className="gradient-text">Ops &amp; Revenue</span>
        </h2>
        <p className="text-muted-foreground">
          Feedback from founders and operators who replaced fragmented vendors with unified systems.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6">
        {testimonials.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="card-glass p-7 flex flex-col relative"
          >
            <Quote className="absolute top-6 right-6 h-7 w-7 text-primary/15" />

            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-primary mb-4">
              <span>{t.pillar}</span>
              <span aria-hidden="true" className="text-muted-foreground">·</span>
              <span className="text-accent tabular-nums">{t.outcome}</span>
            </div>

            <p className="text-sm text-foreground/90 mb-6 leading-relaxed">
              &ldquo;{t.text}&rdquo;
            </p>

            <div className="mt-auto pt-4 border-t border-border">
              <p className="font-heading text-sm font-bold text-foreground">{t.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t.role}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default TestimonialsSection;
