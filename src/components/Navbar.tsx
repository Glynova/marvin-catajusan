import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BrandLogo from "@/components/BrandLogo";
import { ResumeModal } from "@/components/ResumeModal";

const navLinks = [
  { label: "About", href: "#about" },
  { label: "Capabilities", href: "#services" },
  { label: "Work", href: "#portfolio" },
  { label: "Process", href: "#process" },
  { label: "Contact", href: "#contact" },
  { label: "Resume", action: "resume" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("glynova-theme") !== "light";
    }
    return true;
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("glynova-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("glynova-theme", "light");
    }
  }, [dark]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
          scrolled
            ? "bg-background/85 backdrop-blur-xl border-b border-border"
            : "bg-background/50 backdrop-blur-md border-b border-transparent"
        }`}
      >
        <div className="section-container h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single brand wordmark */}
          <a
            href="#"
            aria-label="Glynova home"
            className="inline-flex items-center whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
          >
            <BrandLogo size="md" />
          </a>

          {/* Zone 2: Clean single-line navigation links */}
          <nav className="hidden md:flex items-center gap-7" aria-label="Primary navigation">
            {navLinks.map((l) =>
              l.action === "resume" ? (
                <button
                  key={l.label}
                  type="button"
                  onClick={() => setResumeOpen(true)}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap shrink-0 underline-offset-4 hover:underline bg-transparent border-none cursor-pointer p-0"
                >
                  {l.label}
                </button>
              ) : (
                <a
                  key={l.href}
                  href={l.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap shrink-0 underline-offset-4 hover:underline"
                >
                  {l.label}
                </a>
              )
            )}
          </nav>

          {/* Zone 3: Theme toggle + 1 primary CTA */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setDark(!dark)}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Button variant="hero" size="sm" className="whitespace-nowrap shrink-0" asChild>
              <a href="#contact">Book a Consultation</a>
            </Button>
          </div>

          {/* Mobile controls */}
          <div className="md:hidden flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setDark(!dark)}
              className="p-2.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              type="button"
              className="p-2.5 text-foreground"
              onClick={() => setOpen(!open)}
              aria-label={open ? "Close menu" : "Open menu"}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border overflow-hidden"
            >
              <div className="section-container py-4 flex flex-col gap-3">
                {navLinks.map((l) =>
                  l.action === "resume" ? (
                    <button
                      key={l.label}
                      type="button"
                      onClick={() => {
                        setResumeOpen(true);
                        setOpen(false);
                      }}
                      className="text-left py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none cursor-pointer"
                    >
                      {l.label}
                    </button>
                  ) : (
                    <a
                      key={l.href}
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {l.label}
                    </a>
                  )
                )}
                <Button variant="hero" size="default" className="w-full mt-1" asChild>
                  <a href="#contact" onClick={() => setOpen(false)}>
                    Book a Consultation
                  </a>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <ResumeModal open={resumeOpen} onOpenChange={setResumeOpen} />
    </>
  );
};

export default Navbar;
