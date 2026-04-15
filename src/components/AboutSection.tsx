import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import marvinPhoto from "@/assets/marvin-photo-1.png";
import LazyImage from "@/components/LazyImage";

const strengths = [
"Data-driven campaign strategy & execution",
"Full-funnel lead generation systems",
"Brand positioning that commands premium pricing",
"Marketing automation & CRM integration",
"Conversion rate optimization expertise",
"Scalable paid & organic growth systems"];


const AboutSection = () =>
<section id="about" className="section-padding border-t border-border">
    <div className="section-container">
      <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
        <motion.div
        initial={{ opacity: 0, x: -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}>
        
          <div className="aspect-square rounded-2xl card-glass p-4 flex items-center justify-center relative overflow-hidden">
            <LazyImage
            src={marvinPhoto}
            alt="Marvin Catajusan — Digital Marketing Specialist"
            className="w-full h-full object-cover object-top rounded-xl"
            wrapperClassName="w-full h-full rounded-xl" />
          
          </div>
          <div className="text-center mt-4">
            <p className="font-heading text-xl font-semibold text-foreground">Marvin Catajusan</p>
            <p className="text-sm text-muted-foreground mt-1">Digital Marketing · Brand · Lead Gen</p>
          </div>
        </motion.div>

        <motion.div
        initial={{ opacity: 0, x: 30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}>
        
          <span className="text-primary text-sm font-medium uppercase tracking-widest">About Me</span>
          <h2 className="font-heading text-3xl lg:text-4xl font-bold mt-3 mb-6">
            I Build Systems That{" "}
            <span className="gradient-text">Generate Revenue on Autopilot</span>
          </h2>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            With years of experience in digital marketing, brand strategy, and lead generation, I've helped 10+ businesses transform their online presence into predictable revenue engines. I don't just run ads — I build complete growth ecosystems.
          </p>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            My mission is simple: eliminate wasted ad spend, create brands that sell themselves, and build automated funnels that work while you sleep. Every strategy I deploy is rooted in data, tested by results, and designed to scale.
          </p>

          <div className="grid sm:grid-cols-2 gap-3">
            {strengths.map((s) =>
          <div key={s} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span className="text-sm text-foreground">{s}</span>
              </div>
          )}
          </div>
        </motion.div>
      </div>
    </div>
  </section>;


export default AboutSection;