import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, TrendingUp, Target, Zap } from "lucide-react";
import marvinHero from "@/assets/marvin-photo-2.png";

const stats = [
  { icon: TrendingUp, value: "300%+", label: "Avg. ROI Increase" },
  { icon: Target, value: "10K+", label: "Leads Generated" },
  { icon: Zap, value: "50+", label: "Brands Scaled" },
];

const HeroSection = () => (
  <section className="relative min-h-screen flex items-center pt-16 overflow-hidden" style={{ backgroundImage: "var(--gradient-hero)" }}>
    <div className="section-container w-full">
      <div className="max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 border border-primary/20">
            Marvin Catajusan · Digital Marketing · Brand Strategy · Lead Generation
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="font-heading text-4xl sm:text-5xl lg:text-7xl font-bold leading-[1.1] mb-6"
        >
          I Turn Ad Spend Into{" "}
          <span className="gradient-text">Revenue Machines</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg text-muted-foreground max-w-xl mb-8"
        >
          Results-driven digital marketing specialist helping businesses generate qualified leads, build powerful brands, and scale revenue — with proven systems and data-backed strategies.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-wrap gap-4 mb-16"
        >
          <Button variant="hero" size="lg" asChild>
            <a href="#contact">
              Book a Free Strategy Call <ArrowRight className="ml-1" />
            </a>
          </Button>
          <Button variant="heroOutline" size="lg" asChild>
            <a href="#results">See My Results</a>
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="grid grid-cols-3 gap-6 max-w-lg"
        >
          {stats.map((s) => (
            <div key={s.label} className="text-center sm:text-left">
              <s.icon className="h-5 w-5 text-primary mb-2 mx-auto sm:mx-0" />
              <p className="font-heading text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  </section>
);

export default HeroSection;
