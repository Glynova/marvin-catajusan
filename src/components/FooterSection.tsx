import { Mail, Phone, Briefcase, Github, Download } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { useSyncedResume } from "@/lib/resumeConfig";

const FooterSection = () => {
  const { resume } = useSyncedResume();

  return (
    <footer className="border-t border-border bg-background">
      <div className="section-container py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 pb-10 border-b border-border">
          <div>
            <a href="#" aria-label="Glynova home" className="inline-flex items-center">
              <BrandLogo size="md" />
            </a>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              Marvin Catajusan — Full-Stack Developer, Business Operation System Builder, and Paid Media Specialist.
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Navigation
            </p>
            <ul className="space-y-2 text-sm">
              <li><a href="#about" className="text-muted-foreground hover:text-foreground transition-colors">About</a></li>
              <li><a href="#services" className="text-muted-foreground hover:text-foreground transition-colors">Capabilities</a></li>
              <li><a href="#portfolio" className="text-muted-foreground hover:text-foreground transition-colors">Work &amp; Case Studies</a></li>
              <li><a href="#process" className="text-muted-foreground hover:text-foreground transition-colors">Process</a></li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Direct Contact
            </p>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a
                  href="mailto:pugoymarvin14@gmail.com"
                  className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="h-4 w-4 text-primary shrink-0" />
                  <span>pugoymarvin14@gmail.com</span>
                </a>
              </li>
              <li>
                <a
                  href="mailto:glynova.os@gmail.com"
                  className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Briefcase className="h-4 w-4 text-primary shrink-0" />
                  <span>glynova.os@gmail.com</span>
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/639630167938"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Phone className="h-4 w-4 text-primary shrink-0" />
                  <span>+63 963 016 7938</span>
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Links &amp; Portal
            </p>
            <ul className="space-y-2.5 text-sm">
              {resume.published && (
                <li>
                  <a
                    href={resume.fileUrl}
                    download={resume.downloadFilename}
                    className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Download className="h-4 w-4 text-primary shrink-0" />
                    <span>{resume.buttonLabel}</span>
                  </a>
                </li>
              )}
              <li>
                <a
                  href="https://github.com/Glynova"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Github className="h-4 w-4 text-primary shrink-0" />
                  <span>github.com/Glynova</span>
                </a>
              </li>
              <li>
                <a
                  href="/admin-portal"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Admin Workspace
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Marvin Catajusan · Glynova. All rights reserved.</p>
          <p className="font-medium">Full-Stack · Business Ops · Paid Media</p>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
