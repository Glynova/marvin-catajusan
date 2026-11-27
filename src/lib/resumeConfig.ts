import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ResumeExperience {
  role: string;
  company: string;
  period: string;
  location: string;
  highlights: string[];
}

export interface ResumeEducation {
  degree: string;
  institution: string;
  year: string;
}

export interface ResumeProfile {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  github: string;
  summary: string;
  experiences: ResumeExperience[];
  skills: { category: string; items: string[] }[];
  education: ResumeEducation[];
  fileUrl: string;
  downloadFilename: string;
  buttonLabel: string;
  published: boolean;
}

export const DEFAULT_RESUME_PROFILE: ResumeProfile = {
  name: "Marvin Catajusan",
  title: "Full-Stack Developer, Business Operations & Paid Media Specialist",
  email: "pugoymarvin14@gmail.com",
  phone: "+63 900 000 0000",
  location: "Remote / Global",
  website: "https://glynova.dev",
  github: "https://github.com/Glynova",
  summary:
    "Full-stack software engineer and growth strategist bridging the gap between production web applications (React, Next.js, Node.js, Supabase), internal business operations automation (CRM, ERP, webhooks), and high-scale paid acquisition (Meta, Google, TikTok). Eliminates agency handoffs by engineering the complete tech stack, internal workflows, and growth funnels under one roof.",
  experiences: [
    {
      role: "Founder & Principal Full-Stack Engineer",
      company: "Glynova",
      period: "2024 — Present",
      location: "Remote",
      highlights: [
        "Architected multi-tenant SaaS platforms and custom CRM/ERP fulfillment engines using React, TypeScript, Node.js, and PostgreSQL.",
        "Engineered automated lead qualification agents and omnichannel webhook pipelines connecting Meta Graph API, WhatsApp, and Stripe billing.",
        "Managed and optimized full-funnel paid media campaigns across Meta, Google Ads, and TikTok, delivering 4.2x+ blended ROAS.",
      ],
    },
    {
      role: "Senior Full-Stack & Growth Lead",
      company: "Client Engagements & Tech Consultancies",
      period: "2021 — 2024",
      location: "Remote",
      highlights: [
        "Rebuilt legacy spreadsheet workflows into reactive TypeScript web applications, reducing manual admin overhead by 85%.",
        "Implemented server-side Conversion APIs (CAPI) and offline CRM conversion attribution to scale ad spend profitably past $65K/mo.",
      ],
    },
  ],
  skills: [
    {
      category: "Full-Stack Engineering",
      items: ["React", "TypeScript", "Next.js", "Node.js", "Express", "Supabase", "PostgreSQL", "Tailwind CSS"],
    },
    {
      category: "Business Ops & Workflows",
      items: ["Custom CRM Pipelines", "ERP Fulfillment", "Webhook Pipelines", "n8n / Make", "Stripe API", "Google Calendar API"],
    },
    {
      category: "Paid Media & Acquisition",
      items: ["Meta Ads & CAPI", "Google Search & PMax", "TikTok Ads", "CRO Landing Pages", "Attribution Modeling"],
    },
  ],
  education: [
    {
      degree: "B.S. in Computer Science & Information Systems",
      institution: "University Engineering Program",
      year: "2020",
    },
  ],
  fileUrl: "#resume-pdf",
  downloadFilename: "Marvin_Catajusan_Resume_2026.pdf",
  buttonLabel: "Download Resume",
  published: true,
};

const RESUME_STORAGE_KEY = "glynova_resume_profile_v1";

export function useSyncedResume() {
  const [resume, setResume] = useState<ResumeProfile>(() => {
    try {
      const cached = localStorage.getItem(RESUME_STORAGE_KEY);
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore
    }
    return DEFAULT_RESUME_PROFILE;
  });

  useEffect(() => {
    let mounted = true;
    const fetchFromSupabase = async () => {
      try {
        const { data, error } = await supabase
          .from("portfolio_items")
          .select("*")
          .eq("title", "__GLYNOVA_RESUME_SETTINGS__")
          .maybeSingle();

        if (!error && data && data.description && mounted) {
          const parsed = JSON.parse(data.description) as ResumeProfile;
          setResume(parsed);
          try {
            localStorage.setItem(RESUME_STORAGE_KEY, JSON.stringify(parsed));
          } catch {
            // ignore
          }
        }
      } catch {
        // fallback to default
      }
    };
    fetchFromSupabase();
    return () => {
      mounted = false;
    };
  }, []);

  return { resume };
}
