import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { label: "About", href: "#about" },
  { label: "Services", href: "#services" },
  { label: "Process", href: "#process" },
  { label: "Results", href: "#results" },
  { label: "Portfolio", href: "#portfolio" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Admin Portal", href: "/admin-portal" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [dark]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/60 backdrop-blur-xl border-b border-primary/20 shadow-sm"
          : "bg-background/30 backdrop-blur-lg border-b border-transparent"
      }`}
      style={{ height: scrolled ? 56 : 64 }}
    >
      <div className="section-container flex items-center justify-between h-full">
        <a href="#" className="font-heading text-xl font-bold gradient-text">
          GLYNOVA
        </a>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
              {l.label}
            </a>
          ))}
          <button
            onClick={() => setDark(!dark)}
            className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Button variant="hero" size="sm" asChild>
            <a href="#contact">Book a Call</a>
          </Button>
        </div>

        {/* Mobile toggle */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={() => setDark(!dark)}
            className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="text-foreground" onClick={() => setOpen(!open)}>
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden bg-background/80 backdrop-blur-xl border-b border-border overflow-hidden"
          >
            <div className="section-container py-4 flex flex-col gap-4">
              {navLinks.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  {l.label}
                </a>
              ))}
              <Button variant="hero" size="sm" asChild>
                <a href="#contact" onClick={() => setOpen(false)}>Book a Call</a>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
