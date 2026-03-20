import { motion } from "framer-motion";
import { Search, Compass, Rocket, BarChart3, Repeat } from "lucide-react";

const steps = [
  {
    icon: Search,
    step: "01",
    title: "Audit & Discovery",
    desc: "Deep-dive into your business, competitors, audience, and current marketing. I identify gaps, opportunities, and quick wins before spending a single dollar.",
  },
  {
    icon: Compass,
    step: "02",
    title: "Strategy & Funnel Design",
    desc: "Custom marketing blueprint with channel strategy, funnel architecture, messaging framework, and KPI targets — tailored to your goals and budget.",
  },
  {
    icon: Rocket,
    step: "03",
    title: "Launch Campaigns",
    desc: "Execute across paid ads, organic content, email sequences, and landing pages. Everything goes live with tracking and attribution in place from day one.",
  },
  {
    icon: BarChart3,
    step: "04",
    title: "Optimize Conversions",
    desc: "Continuous A/B testing, creative iteration, and funnel optimization. I squeeze maximum ROI from every touchpoint based on real performance data.",
  },
  {
    icon: Repeat,
    step: "05",
    title: "Scale & Automate",
    desc: "Once we find what works, we scale it. Marketing automation, retargeting, and systems ensure growth continues without 10x-ing your workload.",
  },
];

const ProcessSection = () => (
  <section id="process" className="section-padding border-t border-border">
    <div className="section-container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center max-w-2xl mx-auto mb-16"
      >
        <span className="text-primary text-sm font-medium uppercase tracking-widest">My Process</span>
        <h2 className="font-heading text-3xl lg:text-4xl font-bold mt-3 mb-4">
          A Proven <span className="gradient-text">5-Step System</span>
        </h2>
        <p className="text-muted-foreground">From audit to autopilot — here's exactly how I take brands from stagnant to scaling.</p>
      </motion.div>

      <div className="relative">
        {/* Vertical line */}
        <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-border -translate-x-1/2" />

        <div className="space-y-12 md:space-y-0">
          {steps.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`md:flex items-center gap-8 md:mb-16 last:mb-0 ${i % 2 === 0 ? "" : "md:flex-row-reverse"}`}
            >
              <div className={`md:w-1/2 ${i % 2 === 0 ? "md:text-right md:pr-12" : "md:text-left md:pl-12"}`}>
                <div className={`card-glass p-6 inline-block text-left ${i % 2 === 0 ? "md:ml-auto" : ""}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <s.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <span className="text-xs text-primary font-medium">STEP {s.step}</span>
                      <h3 className="font-heading text-lg font-bold">{s.title}</h3>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </div>

              {/* Center dot */}
              <div className="hidden md:flex w-4 h-4 rounded-full bg-primary border-4 border-background absolute left-1/2 -translate-x-1/2 glow-primary" style={{ top: `${i * 25 + 2}%` }} />

              <div className="md:w-1/2" />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default ProcessSection;
