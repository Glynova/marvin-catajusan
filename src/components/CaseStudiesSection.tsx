import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  LEGACY_CASE_STUDIES,
  isSystemResumeRow,
  mapRowToShowcaseProject,
  type PortfolioRow,
  type ShowcaseProject,
} from "@/data/portfolioData";

const CaseStudiesSection = () => {
  const [cases, setCases] = useState<ShowcaseProject[]>(LEGACY_CASE_STUDIES);

  useEffect(() => {
    let mounted = true;
    const loadCaseStudies = async () => {
      try {
        const { data, error } = await supabase
          .from("portfolio_items")
          .select("*")
          .order("order_index", { ascending: true });

        if (!error && data && mounted) {
          const projectRows = (data as PortfolioRow[]).filter(
            (row) => !isSystemResumeRow(row)
          );
          if (projectRows.length > 0) {
            const liveCases = projectRows
              .map(mapRowToShowcaseProject)
              .filter((item) => item.published && item.itemKind === "case-study");
            setCases(liveCases);
          }
        }
      } catch {
        // Fallback silently to built-in case studies if offline
      }
    };
    loadCaseStudies();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section id="results" className="section-padding border-t border-border">
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-10 md:mb-16"
        >
          <span className="text-primary text-sm font-medium uppercase tracking-widest">
            Case Studies
          </span>
          <h2 className="font-heading text-3xl lg:text-4xl font-bold mt-3 mb-4">
            Real <span className="gradient-text">Results</span>, Real Growth
          </h2>
          <p className="text-muted-foreground">
            Numbers don&apos;t lie. Here&apos;s what happens when strategy meets execution.
          </p>
        </motion.div>

        <div className="space-y-8">
          {cases.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="card-glass p-8"
            >
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h3 className="font-heading text-xl font-bold">{c.title}</h3>
                <span className="text-xs text-muted-foreground font-medium tabular-nums">
                  {c.clientType}
                </span>
              </div>

              {c.metrics.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {c.metrics.map((m) => (
                    <div
                      key={m.label}
                      className="bg-secondary/50 rounded-lg p-4 text-center border border-border"
                    >
                      <p className="text-xs text-muted-foreground mb-1">{m.label}</p>
                      <div className="flex items-center justify-center gap-2 text-sm tabular-nums">
                        <span className="text-muted-foreground">{m.before}</span>
                        <span className="text-primary">→</span>
                        <span className="font-bold text-foreground">{m.after}</span>
                      </div>
                      <p className="text-xs font-bold text-primary mt-1 tabular-nums">
                        {m.delta}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-sm text-muted-foreground">{c.summary}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CaseStudiesSection;
