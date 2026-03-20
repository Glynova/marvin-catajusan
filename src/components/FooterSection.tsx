import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

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

    {/* Bottom */}
    <div className="border-t border-border">
      <div className="section-container py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <a href="#" className="font-heading text-lg font-bold gradient-text">GLYNOVA</a>
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
