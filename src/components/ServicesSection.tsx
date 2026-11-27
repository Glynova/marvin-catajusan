import { useState } from "react";
import { motion } from "framer-motion";
import { Code2, Workflow, BarChart3, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TECH_STACK_CATEGORIES } from "@/data/portfolioData";

const pillars = [
  {
    index: "01",
    icon: Code2,
    title: "Full-Stack Development",
    subtitle: "React · Next.js · Node.js · Supabase",
    description:
      "Custom SaaS applications, client portals, booking engines, and REST/GraphQL APIs engineered with clean relational schemas and high performance.",
    problems: [
      "Slow templates hurting conversion & SEO",
      "Fragile no-code prototypes hitting scale limits",
      "Disconnected auth, billing & database layers",
    ],
    deliverables: [
      "Production React / Next.js & TypeScript apps",
      "PostgreSQL, Supabase RLS & Node.js backends",
      "Stripe billing, webhooks & role-based portals",
    ],
  },
  {
    index: "02",
    icon: Workflow,
    title: "Business Operation Systems",
    subtitle: "CRM · ERP · AI Agents · Automation",
    description:
      "Internal operating systems that unify lead routing, fulfillment, billing, and AI qualification—replacing manual spreadsheets with reliable automation.",
    problems: [
      "Leads lost between social DMs, forms & spreadsheets",
      "Hours wasted on repetitive admin & invoicing",
      "Zero real-time visibility into team pipeline & margin",
    ],
    deliverables: [
      "Custom CRM pipelines & lightweight ERP workflows",
      "24/7 AI lead qualification & omnichannel webhooks",
      "Automated SLA alerts, dispatch & KPI dashboards",
    ],
  },
  {
    index: "03",
    icon: BarChart3,
    title: "Paid Media Specialist",
    subtitle: "Meta · Google · TikTok · Attribution",
    description:
      "Data-driven acquisition campaigns paired with server-side Conversion APIs and custom-built landing experiences to maximize net contribution margin.",
    problems: [
      "Wasted ad spend optimizing for low-quality clicks",
      "Broken pixel tracking after iOS privacy updates",
      "Ad agencies disconnected from CRM close rates",
    ],
    deliverables: [
      "Meta, Google Search & TikTok funnel architecture",
      "Server-side CAPI & offline CRM conversion sync",
      "Creative testing frameworks & high-speed CRO pages",
    ],
  },
];

const ServicesSection = () => {
  const [activeStackId, setActiveStackId] = useState(TECH_STACK_CATEGORIES[0].id);
  const activeStack =
    TECH_STACK_CATEGORIES.find((c) => c.id === activeStackId) ?? TECH_STACK_CATEGORIES[0];

  return (
    <section id="services" className="section-padding border-t border-border">
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl mb-12 md:mb-14"
        >
          <p className="text-xs font-medium text-primary uppercase tracking-widest mb-3">
            Capabilities
          </p>
          <h2 className="font-heading text-3xl lg:text-4xl font-bold mb-4">
            Three Core Pillars Built to{" "}
            <span className="gradient-text">Work as One System</span>
          </h2>
          <p className="text-muted-foreground">
            From frontend software and backend operations to paid traffic acquisition—every layer is engineered for measurable output.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {pillars.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="card-glass p-7 flex flex-col hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="w-11 h-11 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <p.icon className="h-5 w-5 text-primary" />
                </div>
                <span className="font-medium text-xs text-muted-foreground tabular-nums">
                  {p.index}.
                </span>
              </div>

              <h3 className="font-heading text-xl font-bold text-foreground mb-1">{p.title}</h3>
              <p className="text-xs font-medium text-primary mb-4">{p.subtitle}</p>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{p.description}</p>

              <div className="mb-5 pt-4 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                  Bottlenecks Solved
                </p>
                <ul className="space-y-1.5">
                  {p.problems.map((prob) => (
                    <li key={prob} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-accent mt-0.5 text-xs">—</span>
                      <span>{prob}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-auto pt-4 border-t border-border">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2.5">
                  What Ships
                </p>
                <ul className="space-y-1.5">
                  {p.deliverables.map((del) => (
                    <li key={del} className="text-sm text-foreground flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{del}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Interactive Technical Stack & Integrations Matrix */}
        <div className="mt-12 card-glass p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-border">
            <div>
              <p className="text-xs font-medium text-primary uppercase tracking-widest mb-1">
                Technical Stack &amp; Tooling
              </p>
              <h3 className="font-heading text-xl font-bold text-foreground">
                Production Tools Across Every Layer
              </h3>
            </div>

            <div
              className="flex flex-wrap gap-1.5 p-1 bg-secondary rounded-lg"
              role="tablist"
              aria-label="Technical stack categories"
            >
              {TECH_STACK_CATEGORIES.map((cat) => {
                const isActive = cat.id === activeStackId;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveStackId(cat.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-6">
            <p className="text-sm text-muted-foreground mb-6">{activeStack.summary}</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {activeStack.items.map((item) => (
                <div
                  key={item.name}
                  className="p-4 rounded-lg bg-secondary/40 border border-border"
                >
                  <p className="font-heading text-sm font-semibold text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.role}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 flex justify-center">
          <Button variant="hero" size="lg" className="whitespace-nowrap shrink-0" asChild>
            <a href="#contact">
              Scope Your Build or Campaign <ArrowRight className="ml-1 h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
