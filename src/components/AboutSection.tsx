import { motion } from "framer-motion";
import { CheckCircle2, Download } from "lucide-react";
import marvinPhoto from "@/assets/marvin-photo-1.png";
import LazyImage from "@/components/LazyImage";
import { useSyncedResume } from "@/lib/resumeConfig";

const strengths = [
  "Production React, Next.js, Node.js & Supabase engineering",
  "Custom CRM, ERP & internal workflow automation",
  "AI qualification agents & omnichannel webhook pipelines",
  "Meta, Google & TikTok paid media campaign management",
  "Server-side Conversion API & offline CRM attribution",
  "High-converting custom landing & checkout engineering",
];

const AboutSection = () => {
  const { resume } = useSyncedResume();

  return (
    <section id="about" className="section-padding border-t border-border">
      <div className="section-container">
        <div className="grid md:grid-cols-12 gap-10 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="md:col-span-5"
          >
            <div className="aspect-[4/5] rounded-xl border border-border bg-card overflow-hidden relative">
              <LazyImage
                src={marvinPhoto}
                alt="Marvin Catajusan — Full-Stack Developer & Systems Architect"
                className="w-full h-full object-cover object-top"
                wrapperClassName="w-full h-full"
              />
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span>Marvin Catajusan</span>
              <span>Founder · Glynova</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="md:col-span-7"
          >
            <p className="text-xs font-medium text-primary uppercase tracking-widest mb-3">
              About &amp; Approach
            </p>
            <h2 className="font-heading text-3xl lg:text-4xl font-bold mb-6 leading-tight">
              One Technical Partner From{" "}
              <span className="gradient-text">Codebase to Revenue</span>
            </h2>
            <p className="text-muted-foreground mb-5 leading-relaxed">
              Running paid traffic into a slow landing page or a broken spreadsheet pipeline burns capital. I bridge the gap between engineering, business operations, and customer acquisition—building the web applications, automated CRM/ERP backends, and paid media systems together as one cohesive machine.
            </p>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Whether you need a production Next.js SaaS product, an internal operations hub that eliminates manual data entry, or a profitable Meta and Google Ads engine wired directly to CRM revenue events, every piece is engineered to talk to the rest of your stack.
            </p>

            <div className="grid sm:grid-cols-2 gap-3.5 pt-6 border-t border-border">
              {strengths.map((s) => (
                <div key={s} className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-sm text-foreground">{s}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;