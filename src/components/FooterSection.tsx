import { Button } from "@/components/ui/button";
import { ArrowRight, Mail, Phone, Briefcase } from "lucide-react";

const FooterSection = () => (
  <footer className="border-t border-border">
    {/* CTA Banner */}
    <div className="section-container section-padding text-center">
      <h2 className="font-heading text-3xl lg:text-4xl font-bold mb-4">
        Ready to <span className="gradient-text">Scale Your Business</span>?
      </h2>
      <p className="text-muted-foreground max-w-lg mx-auto mb-8">
        Stop guessing. Start growing. Let's build a marketing system that works — so you can focus on what you do best.
      </p>
      <Button variant="hero" size="lg" asChild>
        <a href="#contact">
          Book Your Free Strategy Call <ArrowRight className="ml-1" />
        </a>
      </Button>
    </div>

    {/* Contact Details */}
    <div className="border-t border-border">
      <div className="section-container py-10">
        <div className="grid sm:grid-cols-3 gap-6 text-center">
          <a href="mailto:pugoymarvin14@gmail.com" className="flex flex-col items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Personal Email</span>
            <span className="text-sm text-foreground group-hover:text-primary transition-colors">pugoymarvin14@gmail.com</span>
          </a>
          <a href="mailto:glynova.os@gmail.com" className="flex flex-col items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Business Email</span>
            <span className="text-sm text-foreground group-hover:text-primary transition-colors">glynova.os@gmail.com</span>
          </a>
          <a href="https://wa.me/639630167938" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Phone className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">WhatsApp</span>
            <span className="text-sm text-foreground group-hover:text-primary transition-colors">+63 963 016 7938</span>
          </a>
        </div>
      </div>
    </div>

    {/* Bottom */}
    <div className="border-t border-border">
      <div className="section-container py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <a href="/admin-portal" className="font-heading text-lg font-bold gradient-text">GLYNOVA</a>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Glynova. All rights reserved.</p>
        <div className="flex gap-6">
          {["LinkedIn", "Twitter", "Instagram"].map((s) => (
            <a key={s} href="#" className="text-xs text-muted-foreground hover:text-primary transition-colors">{s}</a>
          ))}
        </div>
      </div>
    </div>
  </footer>
);

export default FooterSection;
