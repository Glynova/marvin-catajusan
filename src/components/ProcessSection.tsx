import { motion } from "framer-motion";
import { Search, Compass, Code2, LineChart } from "lucide-react";

const steps = [
  {
    icon: Search,
    step: "01",
    title: "System & Funnel Audit",
    desc: "Map your current web stack, internal operations bottlenecks, CRM tracking gaps, and paid media unit economics before writing code or launching ads.",
  },
  {
    icon: Compass,
    step: "02",
    title: "Architecture & Growth Blueprint",
    desc: "Define the database schema, webhook automation plan, conversion landing pages, and channel budget allocation aligned to net revenue targets.",
  },
  {
    icon: Code2,
    step: "03",
    title: "Build, Integrate & Launch",
    desc: "Ship the React/Next.js application, wire Supabase/CRM/ERP workflows, configure server-side Conversion APIs, and launch acquisition campaigns.",
  },
  {
    icon: LineChart,
    step: "04",
    title: "Telemetry, Optimize & Scale",
    desc: "Monitor real-time pipeline conversion, iterate ad creatives and landing UX, and automate repetitive ops as lead volume scales.",
  },
];

const ProcessSection = () => (
  <section id="process" className="section-padding border-t border-border">
    <div className="section-container">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-2xl mb-12"
      >
        <p className="text-xs font-medium tabular-nums text-primary uppercase tracking-widest mb-3">
          Delivery Process
        </p>
        <h2 className="font-heading text-3xl lg:text-4xl font-bold mb-4">
          How Every Engagement <span className="gradient-text">Ships &amp; Scales</span>
        </h2>
        <p className="text-muted-foreground">
          A four-stage engineering and growth workflow built to keep software, internal operations, and ad spend tightly synchronized.
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((s, i) => (
          <motion.div
            key={s.step}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="card-glass p-6 flex flex-col"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="font-medium tabular-nums text-xs text-primary tabular-nums">{s.step}.</span>
            </div>
            <h3 className="font-heading text-lg font-bold text-foreground mb-2">{s.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default ProcessSection;
