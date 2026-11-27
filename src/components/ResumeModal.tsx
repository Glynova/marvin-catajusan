import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, Mail, MapPin, Phone, Check } from "lucide-react";
import { useSyncedResume } from "@/lib/resumeConfig";

interface ResumeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ResumeModal = ({ open, onOpenChange }: ResumeModalProps) => {
  const { resume } = useSyncedResume();
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border p-6 sm:p-8">
        <DialogHeader className="border-b border-border pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <DialogTitle className="font-heading text-2xl font-bold text-foreground">
                {resume.name}
              </DialogTitle>
              <p className="text-xs text-primary font-medium mt-1">
                {resume.title}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="hero"
                size="sm"
                asChild
                className="gap-1.5 text-xs h-9"
              >
                <a
                  href={resume.fileUrl && resume.fileUrl !== "#resume-pdf" ? resume.fileUrl : "#contact"}
                  download={resume.fileUrl && resume.fileUrl !== "#resume-pdf" ? resume.downloadFilename : undefined}
                  target={resume.fileUrl && resume.fileUrl !== "#resume-pdf" ? "_blank" : undefined}
                  rel={resume.fileUrl && resume.fileUrl !== "#resume-pdf" ? "noopener noreferrer" : undefined}
                >
                  <Download className="h-3.5 w-3.5" /> {resume.buttonLabel}
                </a>
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-3">
            <span className="inline-flex items-center gap-1">
              <Mail className="h-3.5 w-3.5 text-primary" /> {resume.email}
            </span>
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3.5 w-3.5 text-primary" /> {resume.phone}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-primary" /> {resume.location}
            </span>
            <a
              href={resume.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" /> {resume.website.replace(/^https?:\/\//, "")}
            </a>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-2 text-foreground">
          {/* Summary */}
          <div className="space-y-2">
            <h3 className="font-heading text-xs font-semibold uppercase tracking-wider text-primary">
              Executive Summary
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {resume.summary}
            </p>
          </div>

          {/* Experience */}
          <div className="space-y-4">
            <h3 className="font-heading text-xs font-semibold uppercase tracking-wider text-primary">
              Professional Experience
            </h3>
            <div className="space-y-4">
              {resume.experiences.map((exp, idx) => (
                <div key={idx} className="p-4 rounded-lg bg-secondary/40 border border-border space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <h4 className="font-heading font-semibold text-sm text-foreground">
                        {exp.role} <span className="text-primary">· {exp.company}</span>
                      </h4>
                    </div>
                    <span className="text-xs text-muted-foreground font-medium tabular-nums">
                      {exp.period} ({exp.location})
                    </span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground leading-relaxed">
                    {exp.highlights.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Skills Matrix */}
          <div className="space-y-3">
            <h3 className="font-heading text-xs font-semibold uppercase tracking-wider text-primary">
              Technical &amp; Execution Skills
            </h3>
            <div className="grid sm:grid-cols-3 gap-3">
              {resume.skills.map((skillGroup, idx) => (
                <div key={idx} className="p-3.5 rounded-lg bg-secondary/30 border border-border space-y-2">
                  <p className="font-semibold text-xs text-foreground">
                    {skillGroup.category}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {skillGroup.items.join(" · ")}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Education */}
          {resume.education && resume.education.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-heading text-xs font-semibold uppercase tracking-wider text-primary">
                Education
              </h3>
              {resume.education.map((edu, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    <strong className="text-foreground">{edu.degree}</strong> — {edu.institution}
                  </span>
                  <span className="tabular-nums">{edu.year}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
