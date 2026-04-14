import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

const cases = [
  {
    client: "E-Commerce Brand",
    industry: "Fashion & Apparel",
    metrics: [
      { label: "CTR", before: "0.8%", after: "3.6%", change: "+350%" },
      { label: "Leads/mo", before: "40", after: "320", change: "+700%" },
      { label: "Conv. Rate", before: "1.2%", after: "4.8%", change: "+300%" },
      { label: "ROAS", before: "1.1x", after: "5.4x", change: "+390%" },
    ],
    summary: "Rebuilt their entire paid ads funnel, introduced email automation, and optimized landing pages — turning a barely-profitable store into a revenue machine.",
  },
  {
    client: "B2B SaaS Startup",
    industry: "Technology",
    metrics: [
      { label: "CTR", before: "1.1%", after: "4.2%", change: "+281%" },
      { label: "Leads/mo", before: "15", after: "180", change: "+1100%" },
      { label: "Conv. Rate", before: "0.9%", after: "3.7%", change: "+311%" },
      { label: "ROI", before: "0.6x", after: "4.2x", change: "+600%" },
    ],
    summary: "Created a LinkedIn + Google Ads strategy with automated lead scoring and CRM integration. Pipeline went from 15 demos/month to 180+ qualified leads.",
  },
  {
    client: "Local Services Business",
    industry: "Home Services",
    metrics: [
      { label: "CTR", before: "1.5%", after: "5.1%", change: "+240%" },
      { label: "Leads/mo", before: "25", after: "150", change: "+500%" },
      { label: "Conv. Rate", before: "2.1%", after: "6.3%", change: "+200%" },
      { label: "ROI", before: "1.8x", after: "7.2x", change: "+300%" },
    ],
    summary: "Launched geo-targeted ads, built a high-converting landing page, and set up a booking funnel that fills their calendar 3 weeks out consistently.",
  },
];

const CaseStudiesSection = () => (
  <section id="results" className="section-padding border-t border-border">
    <div className="section-container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center max-w-2xl mx-auto mb-10 md:mb-16"
      >
        <span className="text-primary text-sm font-medium uppercase tracking-widest">Case Studies</span>
        <h2 className="font-heading text-3xl lg:text-4xl font-bold mt-3 mb-4">
          Real <span className="gradient-text">Results</span>, Real Growth
        </h2>
        <p className="text-muted-foreground">Numbers don't lie. Here's what happens when strategy meets execution.</p>
      </motion.div>

      <div className="space-y-8">
        {cases.map((c, i) => (
          <motion.div
            key={c.client}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="card-glass p-8"
          >
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="font-heading text-xl font-bold">{c.client}</h3>
              <span className="text-xs text-muted-foreground bg-secondary px-3 py-1 rounded-full">{c.industry}</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {c.metrics.map((m) => (
                <div key={m.label} className="bg-secondary/50 rounded-lg p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{m.label}</p>
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <span className="text-muted-foreground">{m.before}</span>
                    <span className="text-primary">→</span>
                    <span className="font-bold text-foreground">{m.after}</span>
                  </div>
                  <p className="text-xs font-bold text-primary mt-1">{m.change}</p>
                </div>
              ))}
            </div>

            <p className="text-sm text-muted-foreground">{c.summary}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default CaseStudiesSection;
