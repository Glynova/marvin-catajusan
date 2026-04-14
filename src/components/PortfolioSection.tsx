import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";

const projects = [
  {
    title: "Multi-Channel Ad Campaign",
    category: "Digital Marketing",
    description: "Full-funnel Facebook + Google campaign driving 200+ leads/month for a fitness brand with 4.8x ROAS.",
    tags: ["Facebook Ads", "Google Ads", "Landing Pages"],
  },
  {
    title: "Premium Brand Identity",
    category: "Brand Strategy",
    description: "Complete rebrand for a luxury skincare company — from positioning and messaging to visual identity and packaging.",
    tags: ["Brand Positioning", "Visual Identity", "Messaging"],
  },
  {
    title: "Automated Lead Gen System",
    category: "Lead Generation",
    description: "LinkedIn + email automation pipeline generating 150 B2B leads/month with integrated CRM scoring.",
    tags: ["LinkedIn Ads", "Email Automation", "CRM"],
  },
  {
    title: "E-Commerce Growth Engine",
    category: "Digital Marketing",
    description: "Scaled a Shopify store from $8k to $65k/month using retargeting, email flows, and conversion optimization.",
    tags: ["Shopify", "Email Flows", "CRO"],
  },
  {
    title: "SaaS Launch Campaign",
    category: "Lead Generation",
    description: "Go-to-market strategy generating 500+ signups in the first month with a $12 CAC through content + paid.",
    tags: ["Content Marketing", "Paid Ads", "Funnel"],
  },
  {
    title: "Personal Brand Build",
    category: "Brand Strategy",
    description: "Positioned a consultant as an industry thought leader — from zero to 15K followers and inbound leads.",
    tags: ["Personal Brand", "Content", "Social"],
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

const PortfolioSection = () => (
  <section id="portfolio" className="section-padding border-t border-border">
    <div className="section-container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center max-w-2xl mx-auto mb-10 md:mb-16"
      >
        <span className="text-primary text-sm font-medium uppercase tracking-widest">Portfolio</span>
        <h2 className="font-heading text-3xl lg:text-4xl font-bold mt-3 mb-4">
          Featured <span className="gradient-text">Projects</span>
        </h2>
        <p className="text-muted-foreground">A selection of campaigns, brands, and systems I've built for clients.</p>
      </motion.div>

      <motion.div
        className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
      >
        {projects.map((p) => (
          <motion.div
            key={p.title}
            variants={cardVariants}
            className="card-glass p-6 group hover:border-primary/30 transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs text-primary font-medium uppercase tracking-wider">{p.category}</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <h3 className="font-heading text-lg font-bold mb-2">{p.title}</h3>
            <p className="text-sm text-muted-foreground mb-4">{p.description}</p>
            <div className="flex flex-wrap gap-2">
              {p.tags.map((t) => (
                <span key={t} className="text-xs bg-secondary px-2 py-1 rounded text-secondary-foreground">{t}</span>
              ))}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  </section>
);

export default PortfolioSection;
