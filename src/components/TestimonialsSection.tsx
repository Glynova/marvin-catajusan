import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Mitchell",
    role: "CEO, Bloom Skincare",
    text: "Our revenue tripled in 4 months. The funnel system runs on autopilot — I wake up to new leads every morning. Absolute game-changer.",
    stars: 5,
  },
  {
    name: "David Chen",
    role: "Founder, TechPulse SaaS",
    text: "We went from struggling to get demos to having a waitlist. The lead gen system and brand positioning completely transformed our business.",
    stars: 5,
  },
  {
    name: "Maria Rodriguez",
    role: "Owner, Elite Home Services",
    text: "Best marketing investment I've ever made. Our calendar is booked 3 weeks out and cost per lead dropped by 60%. Highly recommend.",
    stars: 5,
  },
  {
    name: "James Patterson",
    role: "CMO, Vertex Group",
    text: "The level of strategy and execution is unmatched. Within 60 days our ad campaigns were profitable for the first time in years.",
    stars: 5,
  },
];

const TestimonialsSection = () => (
  <section id="testimonials" className="section-padding border-t border-border">
    <div className="section-container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center max-w-2xl mx-auto mb-10 md:mb-16"
      >
        <span className="text-primary text-sm font-medium uppercase tracking-widest">Testimonials</span>
        <h2 className="font-heading text-3xl lg:text-4xl font-bold mt-3 mb-4">
          What Clients <span className="gradient-text">Say</span>
        </h2>
        <p className="text-muted-foreground">Results speak for themselves — but my clients say it even better.</p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6">
        {testimonials.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="card-glass p-8 relative"
          >
            <Quote className="absolute top-6 right-6 h-8 w-8 text-primary/10" />
            <div className="flex gap-1 mb-4">
              {Array.from({ length: t.stars }).map((_, j) => (
                <Star key={j} className="h-4 w-4 fill-primary text-primary" />
              ))}
            </div>
            <p className="text-sm text-foreground mb-6 leading-relaxed italic">"{t.text}"</p>
            <div>
              <p className="font-heading font-bold text-foreground">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.role}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default TestimonialsSection;
