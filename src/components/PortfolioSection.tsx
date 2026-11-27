import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ExternalLink, Github, Layers, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  ALL_BUILTIN_PROJECTS,
  isSystemResumeRow,
  mapRowToShowcaseProject,
  type PortfolioRow,
  type ProjectPillar,
  type ShowcaseProject,
} from "@/data/portfolioData";

type FilterOption = "all" | ProjectPillar | "case-study";

const FILTER_TABS: { id: FilterOption; label: string }[] = [
  { id: "all", label: "All Work" },
  { id: "full-stack", label: "Full-Stack" },
  { id: "business-ops", label: "Business Ops" },
  { id: "paid-media", label: "Paid Media" },
  { id: "case-study", label: "Case Studies" },
];

const PortfolioSection = () => {
  const [filter, setFilter] = useState<FilterOption>("all");
  const [cmsProjects, setCmsProjects] = useState<ShowcaseProject[] | null>(null);
  const [selectedProject, setSelectedProject] = useState<ShowcaseProject | null>(
    null
  );
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let mounted = true;
    const loadCmsProjects = async () => {
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
            const mapped = projectRows
              .map(mapRowToShowcaseProject)
              .filter((project) => project.published);
            setCmsProjects(mapped);
          } else {
            // Fresh database before first CMS sync: show built-in catalog
            setCmsProjects(null);
          }
        }
      } catch {
        // Fallback cleanly to built-in catalog if offline
      }
    };
    loadCmsProjects();
    return () => {
      mounted = false;
    };
  }, []);

  const allProjects = useMemo(
    () => (cmsProjects !== null ? cmsProjects : ALL_BUILTIN_PROJECTS),
    [cmsProjects]
  );

  const counts = useMemo(
    () => ({
      all: allProjects.length,
      "full-stack": allProjects.filter((p) => p.pillar === "full-stack").length,
      "business-ops": allProjects.filter((p) => p.pillar === "business-ops").length,
      "paid-media": allProjects.filter((p) => p.pillar === "paid-media").length,
      "case-study": allProjects.filter((p) => p.itemKind === "case-study").length,
    }),
    [allProjects]
  );

  const filteredProjects = useMemo(() => {
    if (filter === "all") return allProjects;
    if (filter === "case-study") {
      return allProjects.filter((p) => p.itemKind === "case-study");
    }
    return allProjects.filter((p) => p.pillar === filter);
  }, [allProjects, filter]);

  const markImageFailed = (id: string) => {
    setFailedImages((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <section id="portfolio" className="section-padding border-t border-border">
      <div className="section-container">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10 md:mb-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl"
          >
            <p className="text-xs font-medium tabular-nums text-primary uppercase tracking-widest mb-3">
              Selected Work &amp; Case Studies
            </p>
            <h2 className="font-heading text-3xl lg:text-4xl font-bold mb-3">
              Systems &amp; Campaigns{" "}
              <span className="gradient-text">Built for Impact</span>
            </h2>
            <p className="text-muted-foreground">
              Filter across full-stack software, internal operations systems, paid acquisition builds, and growth case studies. Inspect any project for architecture notes, quantified metrics, or live demos.
            </p>
          </motion.div>

          {/* Interactive segmented filter tabs */}
          <div
            className="inline-flex flex-wrap items-center gap-1 p-1 bg-secondary rounded-lg self-start lg:self-auto"
            role="tablist"
            aria-label="Filter projects by discipline"
          >
            {FILTER_TABS.map((tab) => {
              const active = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(tab.id)}
                  className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`font-medium tabular-nums text-[11px] ${
                      active ? "text-primary-foreground/80" : "text-muted-foreground/70"
                    }`}
                  >
                    {counts[tab.id]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="card-glass p-12 text-center">
            <p className="text-muted-foreground mb-4">
              No published projects match this filter yet.
            </p>
            <Button variant="outline" size="sm" onClick={() => setFilter("all")}>
              Show All Projects
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => {
              const showFallback = !project.imageUrl || failedImages[project.id];
              return (
                <article
                  key={project.id}
                  className="card-glass overflow-hidden flex flex-col group hover:border-primary/40 transition-colors"
                >
                  {/* Visual Preview */}
                  <button
                    type="button"
                    onClick={() => setSelectedProject(project)}
                    className="relative aspect-[4/3] w-full overflow-hidden bg-secondary text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Open case study for ${project.title}`}
                  >
                    {showFallback ? (
                      <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-secondary via-card to-primary/10">
                        <Layers className="h-8 w-8 text-primary/70 mb-2" />
                        <p className="font-heading text-sm font-semibold text-foreground text-center">
                          {project.title}
                        </p>
                      </div>
                    ) : project.mediaType === "video" ? (
                      <video
                        src={project.imageUrl}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                      />
                    ) : (
                      <img
                        src={project.imageUrl}
                        alt={project.title}
                        referrerPolicy="no-referrer"
                        onError={() => markImageFailed(project.id)}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        loading="lazy"
                      />
                    )}
                  </button>

                  {/* Card Body — Zero Pill Metadata */}
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-center justify-between gap-2 text-xs font-medium tabular-nums text-muted-foreground mb-2">
                      <span className="text-primary truncate">{project.categoryLabel}</span>
                    </div>

                    <h3 className="font-heading text-lg font-bold text-foreground mb-2 leading-snug">
                      <button
                        type="button"
                        onClick={() => setSelectedProject(project)}
                        className="text-left hover:text-primary transition-colors focus-visible:outline-none focus-visible:underline"
                      >
                        {project.title}
                      </button>
                    </h3>

                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
                      {project.summary}
                    </p>

                    <div className="pt-3 mt-auto border-t border-border space-y-3">
                      <p className="text-xs font-semibold text-foreground tabular-nums">
                        {project.outcomeHeadline}
                      </p>

                      <p className="text-xs text-muted-foreground truncate">
                        {project.stack.join(" · ")}
                      </p>

                      <div className="flex items-center justify-between gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => setSelectedProject(project)}
                          className="text-xs font-medium text-primary hover:underline underline-offset-4 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                        >
                          Case Study <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>

                        <div className="flex items-center gap-3">
                          {project.repoUrl && (
                            <a
                              href={project.repoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                              aria-label={`View source repository for ${project.title}`}
                            >
                              <Github className="h-3.5 w-3.5" />
                              <span>Code</span>
                            </a>
                          )}
                          {project.liveDemoUrl && (
                            <a
                              href={project.liveDemoUrl}
                              target={
                                project.liveDemoUrl.startsWith("http")
                                  ? "_blank"
                                  : undefined
                              }
                              rel={
                                project.liveDemoUrl.startsWith("http")
                                  ? "noopener noreferrer"
                                  : undefined
                              }
                              className="text-xs font-medium text-foreground hover:text-primary inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                            >
                              <span>Live Demo</span>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Case Study & Architecture Detail Modal */}
      <Dialog
        open={Boolean(selectedProject)}
        onOpenChange={(open) => {
          if (!open) setSelectedProject(null);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-border p-0">
          {selectedProject && (
            <div>
              <div className="relative aspect-[16/9] w-full bg-secondary overflow-hidden border-b border-border">
                {!selectedProject.imageUrl || failedImages[selectedProject.id] ? (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-secondary via-card to-primary/10">
                    <Layers className="h-10 w-10 text-primary/70 mb-2" />
                    <p className="font-heading text-lg font-bold text-foreground">
                      {selectedProject.title}
                    </p>
                  </div>
                ) : selectedProject.mediaType === "video" ? (
                  <video
                    src={selectedProject.imageUrl}
                    controls
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={selectedProject.imageUrl}
                    alt={selectedProject.title}
                    referrerPolicy="no-referrer"
                    onError={() => markImageFailed(selectedProject.id)}
                    className="w-full h-full object-cover"
                  />
                )}
                <button
                  type="button"
                  onClick={() => setSelectedProject(null)}
                  aria-label="Close case study modal"
                  className="absolute top-3 right-3 w-9 h-9 rounded-lg bg-background/85 backdrop-blur border border-border text-foreground flex items-center justify-center hover:bg-background transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6 md:p-8 space-y-6">
                <DialogHeader>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-medium tabular-nums text-primary mb-2">
                    <span>{selectedProject.categoryLabel}</span>
                    <span aria-hidden="true" className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{selectedProject.clientType}</span>
                  </div>
                  <DialogTitle className="font-heading text-2xl md:text-3xl font-bold text-foreground text-left">
                    {selectedProject.title}
                  </DialogTitle>
                </DialogHeader>

                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                  {selectedProject.summary}
                </p>

                {selectedProject.metrics.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    {selectedProject.metrics.map((m) => (
                      <div
                        key={m.label}
                        className="p-4 rounded-lg bg-secondary/50 border border-border"
                      >
                        <p className="text-xs text-muted-foreground mb-1">{m.label}</p>
                        <div className="flex items-center gap-1.5 text-sm font-medium tabular-nums">
                          <span className="text-muted-foreground">{m.before}</span>
                          <span className="text-primary">→</span>
                          <span className="font-bold text-foreground">{m.after}</span>
                        </div>
                        <p className="text-xs font-semibold text-accent mt-1 tabular-nums">
                          {m.delta}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-border">
                  <div>
                    <h4 className="font-heading text-sm font-semibold text-foreground uppercase tracking-wider mb-2">
                      The Challenge
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedProject.challenge}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-heading text-sm font-semibold text-foreground uppercase tracking-wider mb-2">
                      Architecture &amp; Execution
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedProject.architecture}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <p className="text-xs font-medium tabular-nums text-muted-foreground uppercase tracking-wider mb-2">
                    Stack &amp; Integrations
                  </p>
                  <p className="text-sm font-medium tabular-nums text-foreground">
                    {selectedProject.stack.join(" · ")}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
                  <div className="flex flex-wrap items-center gap-3">
                    {selectedProject.liveDemoUrl && (
                      <Button variant="hero" size="sm" asChild>
                        <a
                          href={selectedProject.liveDemoUrl}
                          target={
                            selectedProject.liveDemoUrl.startsWith("http")
                              ? "_blank"
                              : undefined
                          }
                          rel={
                            selectedProject.liveDemoUrl.startsWith("http")
                              ? "noopener noreferrer"
                              : undefined
                          }
                          onClick={() => {
                            if (!selectedProject.liveDemoUrl?.startsWith("http")) {
                              setSelectedProject(null);
                            }
                          }}
                        >
                          {selectedProject.liveDemoUrl.startsWith("http")
                            ? "Open Live Demo"
                            : "Request Live Walkthrough"}
                          <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                    {selectedProject.repoUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={selectedProject.repoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Github className="mr-1.5 h-3.5 w-3.5" />
                          View GitHub
                        </a>
                      </Button>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedProject(null);
                      document
                        .getElementById("contact")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    Build Something Similar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default PortfolioSection;
