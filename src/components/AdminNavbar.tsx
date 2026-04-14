import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  LogOut, Users, Image, Share2, Brain, Menu, X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const links = [
  { label: "Leads", href: "/admin/leads", icon: Users },
  { label: "Portfolio", href: "/admin/portfolio", icon: Image },
  { label: "Social", href: "/admin/social", icon: Share2 },
  { label: "Ads AI", href: "/admin/ads-intelligence", icon: Brain },
];

const AdminNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin-portal");
  };

  return (
    <nav className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/" className="font-heading text-lg font-bold gradient-text">GLYNOVA</a>
          <span className="text-xs text-muted-foreground hidden sm:inline">Admin</span>
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Button
              key={l.href}
              variant="ghost"
              size="sm"
              onClick={() => navigate(l.href)}
              className={`gap-1.5 ${location.pathname === l.href ? "text-primary bg-primary/10" : ""}`}
            >
              <l.icon className="h-4 w-4" /> {l.label}
            </Button>
          ))}
          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5 ml-2">
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-foreground p-2" onClick={() => setOpen(!open)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden bg-card/95 backdrop-blur-xl border-b border-border overflow-hidden"
          >
            <div className="px-4 py-3 flex flex-col gap-1">
              {links.map((l) => (
                <Button
                  key={l.href}
                  variant="ghost"
                  size="sm"
                  onClick={() => { navigate(l.href); setOpen(false); }}
                  className={`justify-start gap-2 ${location.pathname === l.href ? "text-primary bg-primary/10" : ""}`}
                >
                  <l.icon className="h-4 w-4" /> {l.label}
                </Button>
              ))}
              <Button variant="ghost" size="sm" onClick={handleLogout} className="justify-start gap-2 mt-1">
                <LogOut className="h-4 w-4" /> Logout
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default AdminNavbar;
