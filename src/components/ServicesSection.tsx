import { motion } from "framer-motion";
import { Megaphone, Palette, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const services = [
  {
    icon: Megaphone,
    title: "Digital Marketing",
    subtitle: "Ads · Funnels · Automation",
    description: "End-to-end digital marketing campaigns that drive measurable growth across paid and organic channels.",
    problems: ["Wasted ad spend with no ROI", "No clear marketing funnel", "Inconsistent lead flow"],
    results: ["2-5x ROAS on paid campaigns", "Automated nurture sequences", "Predictable monthly lead flow"],
  },
  {
    icon: Palette,
    title: "Brand Strategy",
    subtitle: "Positioning · Messaging · Identity",
    description: "Strategic brand positioning that differentiates you from competitors and commands premium pricing.",
    problems: ["Blending in with competitors", "Unclear value proposition", "Inconsistent brand experience"],
    results: ["Clear market positioning", "Messaging that converts", "Premium brand perception"],
  },
  {
    icon: Users,
    title: "Lead Generation",
    subtitle: "Paid Ads · Organic · CRM Funnels",
    description: "Multi-channel lead generation systems that fill your pipeline with qualified prospects on autopilot.",
    problems: ["Not enough qualified leads", "Manual outreach burning time", "No lead nurturing system"],
    results: ["50-200+ leads per month", "Automated qualification & scoring", "CRM-integrated sales funnel"],
  },
];

const ServicesSection = () => (
  <section id="services" className="section-padding border-t border-border">
    <div className="section-container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center max-w-2xl mx-auto mb-16"
      >
        <span className="text-primary text-sm font-medium uppercase tracking-widest">Services</span>
        <h2 className="font-heading text-3xl lg:text-4xl font-bold mt-3 mb-4">
          Everything You Need to <span className="gradient-text">Scale</span>
        </h2>
        <p className="text-muted-foreground">
          Three core pillars designed to work together — so every dollar you invest multiplies.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6">
        {services.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15 }}
            className="card-glass p-8 flex flex-col group hover:border-primary/30 transition-colors"
          >
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-5">
              <s.icon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-heading text-xl font-bold mb-1">{s.title}</h3>
            <p className="text-xs text-primary mb-4">{s.subtitle}</p>
            <p className="text-sm text-muted-foreground mb-6">{s.description}</p>

            <div className="mb-4">
              <p className="text-xs font-semibold text-destructive/80 uppercase tracking-wider mb-2">Problems I Solve</p>
              <ul className="space-y-1">
                {s.problems.map((p) => (
                  <li key={p} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-destructive/60 mt-1">✕</span> {p}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-auto">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Expected Results</p>
              <ul className="space-y-1">
                {s.results.map((r) => (
                  <li key={r} className="text-sm text-foreground flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span> {r}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="text-center mt-12">
        <Button variant="hero" size="lg" asChild>
          <a href="#contact">Get a Custom Strategy <ArrowRight className="ml-1" /></a>
        </Button>
      </div>
    </div>
  </section>
);

export default ServicesSection;
