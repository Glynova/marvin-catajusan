import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Code2, Download, Workflow, TrendingUp } from "lucide-react";
import marvinHero from "@/assets/marvin-photo-2.png";
import LazyImage from "@/components/LazyImage";
import { useSyncedResume } from "@/lib/resumeConfig";

const heroMetrics = [
  {
    icon: Code2,
    value: "15+",
    label: "Full-Stack Apps & APIs Shipped",
    detail: "React · Next.js · Node · Supabase",
  },
  {
    icon: Workflow,
    value: "40+ hrs/wk",
    label: "Avg. Manual Ops Automated",
    detail: "Custom CRM · ERP · Webhook Pipelines",
  },
  {
    icon: TrendingUp,
    value: "4.2x",
    label: "Avg. Paid Media Blended ROAS",
    detail: "Meta · Google · TikTok Funnels",
  },
];

const HeroSection = () => {
  const { resume } = useSyncedResume();

  return (
    <section
      className="relative pt-28 pb-16 md:pt-32 md:pb-20 overflow-hidden"
      style={{ backgroundImage: "var(--gradient-hero)" }}
    >
      <div className="absolute inset-0 tech-grid opacity-30 pointer-events-none" />
      <div className="section-container relative z-10 w-full">
        <div className="grid md:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          <div className="md:col-span-7 flex flex-col justify-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-wrap items-center gap-2 text-xs font-medium tabular-nums text-primary tracking-wide mb-5"
            >
              <span>Marvin Catajusan</span>
              <span aria-hidden="true" className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">Full-Stack Developer</span>
              <span aria-hidden="true" className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">Business Ops Systems</span>
              <span aria-hidden="true" className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">Paid Media</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="font-heading text-4xl sm:text-5xl lg:text-[3.5rem] font-bold leading-[1.08] mb-6 text-foreground"
            >
              I Build Software, Ops Systems &amp;{" "}
              <span className="gradient-text">Paid Media Engines</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed mb-8"
            >
              Most businesses hire separate web developers, operations consultants, and ad buyers—and lose margin in the handoffs. I architect the full-stack product, automate the internal CRM and ERP workflows, and scale customer acquisition under one roof.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-wrap items-center gap-4"
            >
              <Button variant="hero" size="lg" className="whitespace-nowrap shrink-0" asChild>
                <a href="#contact">
                  Book a Consultation <ArrowRight className="ml-1 h-4 w-4" />
                </a>
              </Button>
              <Button variant="heroOutline" size="lg" className="whitespace-nowrap shrink-0" asChild>
                <a href="#portfolio">Explore Case Studies</a>
              </Button>
            </motion.div>
          </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="hidden md:flex md:col-span-5"
        >
          <div className="relative w-full h-full min-h-[420px] rounded-xl overflow-hidden border border-border bg-card">
            <LazyImage
              src={marvinHero}
              alt="Marvin Catajusan — Full-Stack Developer, Business Operations System Builder & Paid Media Specialist"
              className="w-full h-full object-cover object-top"
              wrapperClassName="w-full h-full"
            />
            <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/85 via-black/45 to-transparent">
              <p className="font-heading text-base font-semibold text-white">Marvin Catajusan</p>
              <p className="text-xs font-medium tabular-nums text-white/80 mt-0.5">
                Engineering · Operations · Acquisition
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Full-width proof metrics strip below hero split */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="mt-12 md:mt-16 pt-8 border-t border-border grid sm:grid-cols-3 gap-6 lg:gap-8"
      >
        {heroMetrics.map((m) => (
          <div key={m.label} className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
              <m.icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium tabular-nums text-2xl font-bold text-foreground tabular-nums">{m.value}</p>
              <p className="text-sm font-medium text-foreground mt-0.5">{m.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{m.detail}</p>
            </div>
          </div>
        ))}
      </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;