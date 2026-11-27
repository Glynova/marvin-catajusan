import { X, ShieldCheck, Lock, Database, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal = ({ isOpen, onClose }: PrivacyPolicyModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-border rounded-xl shadow-2xl p-6 sm:p-8 text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold">Data Privacy & Security Policy</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Last updated: March 2026</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-lg text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <Database className="h-4 w-4 text-primary" />
              <h3>1. Data Collection & Usage</h3>
            </div>
            <p>
              When you submit an inquiry or consultation request through our booking form, we collect essential professional details including your name, corporate email address, phone number, and project requirements. This information is used strictly to evaluate your technical scope, prepare customized architecture proposals, and communicate regarding your project.
            </p>
          </section>

          <section className="space-y-2">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <Lock className="h-4 w-4 text-primary" />
              <h3>2. Enterprise-Grade Encryption & Security</h3>
            </div>
            <p>
              All data transmitted through our web portal is encrypted in transit using TLS 1.3 cryptographic protocols. Stored data and consultation records reside in secure database instances protected by AES-256 encryption at rest, strict access controls, and multi-factor authentication.
            </p>
          </section>

          <section className="space-y-2">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h3>3. Data Retention & Secure Deletion</h3>
            </div>
            <p>
              We retain consultation and communication records only as long as necessary to fulfill the business purposes for which they were collected, or to comply with legal, tax, and regulatory obligations. Upon request, client data and consultation notes can be securely purged from our active databases.
            </p>
          </section>

          <section className="space-y-2">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <Share2 className="h-4 w-4 text-primary" />
              <h3>4. Third-Party Sharing & Confidentiality</h3>
            </div>
            <p>
              We maintain absolute confidentiality regarding all proprietary business processes, source code, and client data discussed during consultations. We never sell, rent, or trade your personal or corporate data to third parties. Information is shared strictly with secure infrastructure providers (e.g., Supabase, cloud hosting) bound by stringent data processing and non-disclosure agreements.
            </p>
          </section>
        </div>

        <div className="mt-8 pt-4 border-t border-border flex justify-end">
          <Button onClick={onClose} className="px-6">
            Understood
          </Button>
        </div>
      </div>
    </div>
  );
};
