import projectFullStackImg from "@/assets/images/project_fullstack_saas_1795660659339.jpg";
import projectBusinessOpsImg from "@/assets/images/project_business_ops_1795660659094.jpg";
import projectPaidMediaImg from "@/assets/images/project_paid_media_1795660660406.jpg";
import projectAiWebhooksImg from "@/assets/images/project_ai_webhooks_1795660660294.jpg";

export type ProjectPillar = "full-stack" | "business-ops" | "paid-media";
export type ProjectKind = "work" | "case-study";
export type BuiltInAssetKey =
  | "fullstack"
  | "business-ops"
  | "paid-media"
  | "ai-webhooks";

export interface CaseMetric {
  label: string;
  before: string;
  after: string;
  delta: string;
}

export interface ShowcaseProject {
  id: string;
  seedKey?: string;
  itemKind: ProjectKind;
  title: string;
  pillar: ProjectPillar;
  categoryLabel: string;
  clientType: string;
  summary: string;
  challenge: string;
  architecture: string;
  outcomeHeadline: string;
  stack: string[];
  metrics: CaseMetric[];
  imageUrl: string;
  assetKey?: BuiltInAssetKey;
  mediaType?: "image" | "video" | "file";
  liveDemoUrl?: string;
  repoUrl?: string;
  published: boolean;
  source: "curated" | "cms";
}

export interface PortfolioRow {
  id: string;
  title: string;
  description: string | null;
  media_url: string | null;
  type: string;
  order_index: number;
  created_at?: string;
}

export const BUILT_IN_ASSET_MAP: Record<BuiltInAssetKey, string> = {
  fullstack: projectFullStackImg,
  "business-ops": projectBusinessOpsImg,
  "paid-media": projectPaidMediaImg,
  "ai-webhooks": projectAiWebhooksImg,
};

export const PILLAR_LABELS: Record<ProjectPillar, string> = {
  "full-stack": "Full-Stack",
  "business-ops": "Business Ops",
  "paid-media": "Paid Media",
};

export const PILLAR_LONG_LABELS: Record<ProjectPillar, string> = {
  "full-stack": "Full-Stack Engineering",
  "business-ops": "Business Operation Systems",
  "paid-media": "Paid Media & Acquisition",
};

export const KIND_LABELS: Record<ProjectKind, string> = {
  work: "Work",
  "case-study": "Case Study",
};

export function sanitizeSafeLinkUrl(raw?: string | null): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("#")) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") {
      return parsed.toString();
    }
  } catch {
    // Reject malformed or unsafe protocols
  }
  return "";
}

export function resolvePortfolioImageUrl(
  mediaUrl?: string | null,
  assetKey?: BuiltInAssetKey
): string {
  const cleanMedia = (mediaUrl || "").trim();
  if (cleanMedia) {
    if (cleanMedia.startsWith("builtin:")) {
      const key = cleanMedia.replace("builtin:", "") as BuiltInAssetKey;
      if (BUILT_IN_ASSET_MAP[key]) return BUILT_IN_ASSET_MAP[key];
    }
    const safeUrl = sanitizeSafeLinkUrl(cleanMedia);
    if (safeUrl && !safeUrl.startsWith("#")) return safeUrl;
    if (cleanMedia.startsWith("/") || cleanMedia.startsWith("data:image/")) {
      return cleanMedia;
    }
  }
  if (assetKey && BUILT_IN_ASSET_MAP[assetKey]) {
    return BUILT_IN_ASSET_MAP[assetKey];
  }
  return "";
}

export const CURATED_PROJECTS: ShowcaseProject[] = [
  {
    id: "curated-saas-portal",
    seedKey: "curated-saas-portal",
    itemKind: "work",
    title: "Multi-Tenant Client & Billing Portal",
    pillar: "full-stack",
    categoryLabel: "Full-Stack · SaaS Web App",
    clientType: "B2B Operations SaaS",
    summary:
      "Production React, Next.js, and Supabase platform unifying client onboarding, automated Stripe invoicing, and role-based project tracking.",
    challenge:
      "The client ran operations across 6 disconnected spreadsheets and manual PDF invoices, causing delayed onboarding and zero real-time margin visibility.",
    architecture:
      "Built a multi-tenant Next.js + TypeScript web app backed by PostgreSQL Row-Level Security on Supabase, Stripe webhook billing sync, and automated Slack alerts.",
    outcomeHeadline: "99.98% Uptime · 65% Faster Onboarding",
    stack: ["Next.js", "TypeScript", "Node.js", "Supabase", "Stripe API"],
    metrics: [
      { label: "Onboarding Time", before: "4.5 days", after: "18 mins", delta: "-99%" },
      { label: "Monthly Active Users", before: "120", after: "1,480", delta: "+1,133%" },
      { label: "Invoice Collection", before: "14 days", after: "Same day", delta: "Automated" },
      { label: "Core Web Vitals", before: "62/100", after: "98/100", delta: "+58%" },
    ],
    imageUrl: projectFullStackImg,
    assetKey: "fullstack",
    mediaType: "image",
    liveDemoUrl: "#contact",
    repoUrl: "https://github.com/Glynova",
    published: true,
    source: "curated",
  },
  {
    id: "curated-ops-erp",
    seedKey: "curated-ops-erp",
    itemKind: "work",
    title: "End-to-End CRM & ERP Fulfillment Engine",
    pillar: "business-ops",
    categoryLabel: "Business Ops · CRM & ERP",
    clientType: "Multi-Location Service Group",
    summary:
      "Custom internal operating system connecting lead intake, automated CRM pipeline routing, inventory tracking, and technician dispatch.",
    challenge:
      "Leads dropped between Meta Lead Forms, WhatsApp chats, and an outdated legacy spreadsheet ERP, wasting 35+ hours of manual admin work every week.",
    architecture:
      "Engineered a central PostgreSQL data model with webhook listeners from Meta, WhatsApp, and email, plus automated stage rules, SLA reminders, and KPI reporting.",
    outcomeHeadline: "38 hrs/wk Saved · 0 Missed Leads",
    stack: ["Custom CRM", "PostgreSQL", "Webhook Pipelines", "Make / n8n", "REST APIs"],
    metrics: [
      { label: "Admin Hours / Week", before: "42 hrs", after: "4 hrs", delta: "-90%" },
      { label: "Speed to Lead", before: "3.2 hrs", after: "45 sec", delta: "-99%" },
      { label: "Pipeline Leakage", before: "31%", after: "<2%", delta: "-94%" },
      { label: "Monthly Capacity", before: "85 jobs", after: "240 jobs", delta: "+182%" },
    ],
    imageUrl: projectBusinessOpsImg,
    assetKey: "business-ops",
    mediaType: "image",
    liveDemoUrl: "#contact",
    repoUrl: "https://github.com/Glynova",
    published: true,
    source: "curated",
  },
  {
    id: "curated-paid-media-engine",
    seedKey: "curated-paid-media-engine",
    itemKind: "work",
    title: "Full-Funnel Meta, Google & TikTok Growth Engine",
    pillar: "paid-media",
    categoryLabel: "Paid Media · Multi-Channel Funnels",
    clientType: "D2C Apparel & E-Commerce",
    summary:
      "Server-side Conversion API tracking, creative testing matrix, and dedicated React landing pages driving profitable scale across Meta, Google, and TikTok.",
    challenge:
      "Rising iOS attribution blind spots and slow template landing pages pushed CPA above break-even at $12K/mo spend.",
    architecture:
      "Implemented server-side CAPI + Google Enhanced Conversions, rebuilt high-speed custom checkout funnels, and structured a 70/20/10 scaling-testing-retargeting budget architecture.",
    outcomeHeadline: "4.8x Blended ROAS · $65K/mo Scale",
    stack: ["Meta Ads", "Google Ads", "TikTok Ads", "Server-Side CAPI", "CRO Landing Pages"],
    metrics: [
      { label: "Blended ROAS", before: "1.4x", after: "4.8x", delta: "+243%" },
      { label: "Qualified Leads / mo", before: "48", after: "320", delta: "+567%" },
      { label: "Landing Conv. Rate", before: "1.3%", after: "4.6%", delta: "+254%" },
      { label: "Monthly Revenue", before: "$8.4K", after: "$65.2K", delta: "+676%" },
    ],
    imageUrl: projectPaidMediaImg,
    assetKey: "paid-media",
    mediaType: "image",
    liveDemoUrl: "#contact",
    published: true,
    source: "curated",
  },
  {
    id: "curated-ai-webhook-ops",
    seedKey: "curated-ai-webhook-ops",
    itemKind: "work",
    title: "AI Qualification Agent & Omnichannel Webhook Hub",
    pillar: "business-ops",
    categoryLabel: "Business Ops · AI & Webhooks",
    clientType: "High-Ticket B2B Consultancy",
    summary:
      "Autonomous AI lead-qualification assistant integrated with Messenger, Instagram DM, WhatsApp, and CRM calendar booking via custom Node.js webhooks.",
    challenge:
      "Sales reps spent 60% of discovery calls with unqualified prospects while social DMs sat unanswered overnight.",
    architecture:
      "Deployed custom Edge/Node webhook endpoints routing incoming social messages through structured LLM qualification prompts, syncing qualified prospects directly into CRM stages.",
    outcomeHeadline: "3.4x Booked Calls · 24/7 Instant Reply",
    stack: ["AI Agents", "Node.js Webhooks", "Meta Graph API", "Supabase Edge", "CRM Sync"],
    metrics: [
      { label: "First Response Time", before: "6.5 hrs", after: "8 sec", delta: "-99%" },
      { label: "Qualified Call Rate", before: "28%", after: "74%", delta: "+164%" },
      { label: "Booked Demos / mo", before: "18", after: "62", delta: "+244%" },
      { label: "Manual Triage", before: "15 hrs/wk", after: "0 hrs/wk", delta: "-100%" },
    ],
    imageUrl: projectAiWebhooksImg,
    assetKey: "ai-webhooks",
    mediaType: "image",
    liveDemoUrl: "#contact",
    repoUrl: "https://github.com/Glynova",
    published: true,
    source: "curated",
  },
  {
    id: "curated-booking-platform",
    seedKey: "curated-booking-platform",
    itemKind: "work",
    title: "Custom Quote Estimator & Real-Time Booking App",
    pillar: "full-stack",
    categoryLabel: "Full-Stack · Custom Web App",
    clientType: "Regional Home & Commercial Services",
    summary:
      "Interactive React + Node.js pricing calculator, instant slot reservation system, and automated SMS/email dispatch synced with Google Calendar.",
    challenge:
      "Prospects abandoned static contact forms waiting 24+ hours for manual quotes, hurting paid search conversion rates.",
    architecture:
      "Built a dynamic step-by-step estimator in React & TypeScript connected to a Node.js API, PostgreSQL booking locks, and automated webhook notifications.",
    outcomeHeadline: "+210% Form-to-Booking Rate",
    stack: ["React", "TypeScript", "Express / Node", "PostgreSQL", "Calendar API"],
    metrics: [
      { label: "Form-to-Booking", before: "19%", after: "59%", delta: "+210%" },
      { label: "Cost per Booked Job", before: "$94", after: "$31", delta: "-67%" },
      { label: "Page Load Speed", before: "4.1s", after: "0.7s", delta: "-83%" },
      { label: "Calendar Fill", before: "45%", after: "92%", delta: "+104%" },
    ],
    imageUrl: projectFullStackImg,
    assetKey: "fullstack",
    mediaType: "image",
    liveDemoUrl: "#contact",
    repoUrl: "https://github.com/Glynova",
    published: true,
    source: "curated",
  },
  {
    id: "curated-b2b-paid-acquisition",
    seedKey: "curated-b2b-paid-acquisition",
    itemKind: "work",
    title: "B2B Demand Capture & Retargeting System",
    pillar: "paid-media",
    categoryLabel: "Paid Media · B2B Acquisition",
    clientType: "Enterprise Workflow SaaS",
    summary:
      "High-intent Google Search + Meta retargeting architecture wired directly into CRM attribution so ad budgets optimize for closed revenue, not cheap clicks.",
    challenge:
      "Previous agency optimized for top-of-funnel PDF downloads that never converted into sales pipeline.",
    architecture:
      "Connected offline CRM deal-stage conversions back to Google Ads & Meta Ads APIs, restructured keyword intent tiers, and launched role-specific interactive product landing pages.",
    outcomeHeadline: "4.2x Pipeline ROI · -54% Cost per Demo",
    stack: ["Google Search Ads", "Meta Retargeting", "Offline Conv. API", "CRM Attribution"],
    metrics: [
      { label: "SQL Demos / mo", before: "15", after: "88", delta: "+487%" },
      { label: "Cost per SQL", before: "$410", after: "$188", delta: "-54%" },
      { label: "Search CTR", before: "1.4%", after: "4.9%", delta: "+250%" },
      { label: "Pipeline ROI", before: "0.9x", after: "4.2x", delta: "+367%" },
    ],
    imageUrl: projectPaidMediaImg,
    assetKey: "paid-media",
    mediaType: "image",
    liveDemoUrl: "#contact",
    published: true,
    source: "curated",
  },
];

export const LEGACY_CASE_STUDIES: ShowcaseProject[] = [
  {
    id: "case-study-ecommerce-apparel",
    seedKey: "case-study-ecommerce-apparel",
    itemKind: "case-study",
    title: "E-Commerce Brand Growth & Checkout Turnaround",
    pillar: "paid-media",
    categoryLabel: "Case Study · Fashion & Apparel",
    clientType: "Fashion & Apparel",
    summary:
      "Rebuilt their entire paid ads funnel, introduced email automation, and optimized landing pages — turning a barely-profitable store into a revenue machine.",
    challenge:
      "Low click-through rates (0.8%) and a 1.2% landing conversion rate left return on ad spend hovering at 1.1x with stalled monthly lead volume.",
    architecture:
      "Restructured Meta & Google acquisition creatives, deployed post-click CRO landing pages, and connected automated email recovery sequences.",
    outcomeHeadline: "5.4x ROAS · 320 Leads/mo (+700%)",
    stack: ["Meta Ads", "Email Automation", "CRO Landing Pages", "Analytics"],
    metrics: [
      { label: "CTR", before: "0.8%", after: "3.6%", delta: "+350%" },
      { label: "Leads/mo", before: "40", after: "320", delta: "+700%" },
      { label: "Conv. Rate", before: "1.2%", after: "4.8%", delta: "+300%" },
      { label: "ROAS", before: "1.1x", after: "5.4x", delta: "+390%" },
    ],
    imageUrl: projectPaidMediaImg,
    assetKey: "paid-media",
    mediaType: "image",
    liveDemoUrl: "#contact",
    published: true,
    source: "curated",
  },
  {
    id: "case-study-b2b-saas-pipeline",
    seedKey: "case-study-b2b-saas-pipeline",
    itemKind: "case-study",
    title: "B2B SaaS Startup Pipeline & CRM Attribution",
    pillar: "paid-media",
    categoryLabel: "Case Study · Technology",
    clientType: "Technology",
    summary:
      "Created a LinkedIn + Google Ads strategy with automated lead scoring and CRM integration. Pipeline went from 15 demos/month to 180+ qualified leads.",
    challenge:
      "Demo flow was capped at 15/month at 0.6x ROI due to untargeted search terms and manual lead qualification bottlenecks.",
    architecture:
      "Paired intent-tiered Google & LinkedIn campaigns with automated lead scoring rules and instant CRM stage routing.",
    outcomeHeadline: "4.2x ROI · 180+ Leads/mo (+1100%)",
    stack: ["LinkedIn Ads", "Google Ads", "Lead Scoring", "CRM Integration"],
    metrics: [
      { label: "CTR", before: "1.1%", after: "4.2%", delta: "+281%" },
      { label: "Leads/mo", before: "15", after: "180", delta: "+1100%" },
      { label: "Conv. Rate", before: "0.9%", after: "3.7%", delta: "+311%" },
      { label: "ROI", before: "0.6x", after: "4.2x", delta: "+600%" },
    ],
    imageUrl: projectBusinessOpsImg,
    assetKey: "business-ops",
    mediaType: "image",
    liveDemoUrl: "#contact",
    published: true,
    source: "curated",
  },
  {
    id: "case-study-local-home-services",
    seedKey: "case-study-local-home-services",
    itemKind: "case-study",
    title: "Local Services Booking Funnel Expansion",
    pillar: "paid-media",
    categoryLabel: "Case Study · Home Services",
    clientType: "Home Services",
    summary:
      "Launched geo-targeted ads, built a high-converting landing page, and set up a booking funnel that fills their calendar 3 weeks out consistently.",
    challenge:
      "Seasonal inquiries fluctuated sharply around 25 leads/month without predictable calendar booking automation.",
    architecture:
      "Deployed geo-fenced local search campaigns feeding a high-speed landing page and direct calendar reservation flow.",
    outcomeHeadline: "7.2x ROI · 150 Leads/mo (+500%)",
    stack: ["Geo-Targeted Ads", "Landing Page CRO", "Booking Funnel"],
    metrics: [
      { label: "CTR", before: "1.5%", after: "5.1%", delta: "+240%" },
      { label: "Leads/mo", before: "25", after: "150", delta: "+500%" },
      { label: "Conv. Rate", before: "2.1%", after: "6.3%", delta: "+200%" },
      { label: "ROI", before: "1.8x", after: "7.2x", delta: "+300%" },
    ],
    imageUrl: projectFullStackImg,
    assetKey: "fullstack",
    mediaType: "image",
    liveDemoUrl: "#contact",
    published: true,
    source: "curated",
  },
];

export const ALL_BUILTIN_PROJECTS: ShowcaseProject[] = [
  ...CURATED_PROJECTS,
  ...LEGACY_CASE_STUDIES,
];

export interface CmsEncodedPayload {
  summary: string;
  seedKey?: string;
  itemKind?: ProjectKind;
  pillar?: ProjectPillar;
  categoryLabel?: string;
  clientType?: string;
  challenge?: string;
  architecture?: string;
  outcomeHeadline?: string;
  stack?: string[];
  metrics?: CaseMetric[];
  liveDemoUrl?: string;
  repoUrl?: string;
  assetKey?: BuiltInAssetKey;
  published?: boolean;
}

const CMS_META_PREFIX = "__GLYNOVA_META__";

function sanitizeMetrics(raw?: CaseMetric[]): CaseMetric[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m) => m && typeof m.label === "string" && m.label.trim().length > 0)
    .map((m) => ({
      label: String(m.label).trim(),
      before: String(m.before ?? "").trim(),
      after: String(m.after ?? "").trim(),
      delta: String(m.delta ?? "").trim(),
    }));
}

export function encodePortfolioDescription(payload: CmsEncodedPayload): string {
  const normalized: CmsEncodedPayload = {
    summary: (payload.summary || "").trim(),
    seedKey: payload.seedKey || undefined,
    itemKind: payload.itemKind || "work",
    pillar: payload.pillar || "full-stack",
    categoryLabel: payload.categoryLabel?.trim() || undefined,
    clientType: payload.clientType?.trim() || undefined,
    challenge: payload.challenge?.trim() || undefined,
    architecture: payload.architecture?.trim() || undefined,
    outcomeHeadline: payload.outcomeHeadline?.trim() || undefined,
    stack: Array.isArray(payload.stack)
      ? payload.stack.map((s) => s.trim()).filter(Boolean)
      : [],
    metrics: sanitizeMetrics(payload.metrics),
    liveDemoUrl: sanitizeSafeLinkUrl(payload.liveDemoUrl) || undefined,
    repoUrl: sanitizeSafeLinkUrl(payload.repoUrl) || undefined,
    assetKey: payload.assetKey || undefined,
    published: payload.published !== false,
  };
  return `${CMS_META_PREFIX}${JSON.stringify(normalized)}`;
}

export function decodePortfolioDescription(raw: string | null): CmsEncodedPayload {
  if (!raw) return { summary: "", itemKind: "work", pillar: "full-stack", published: true };
  if (raw.startsWith(CMS_META_PREFIX)) {
    try {
      const parsed = JSON.parse(raw.slice(CMS_META_PREFIX.length)) as CmsEncodedPayload;
      return {
        summary: parsed.summary || "",
        seedKey: parsed.seedKey || undefined,
        itemKind: parsed.itemKind === "case-study" ? "case-study" : "work",
        pillar: parsed.pillar || "full-stack",
        categoryLabel: parsed.categoryLabel || "",
        clientType: parsed.clientType || "",
        challenge: parsed.challenge || "",
        architecture: parsed.architecture || "",
        outcomeHeadline: parsed.outcomeHeadline || "",
        stack: Array.isArray(parsed.stack) ? parsed.stack : [],
        metrics: sanitizeMetrics(parsed.metrics),
        liveDemoUrl: sanitizeSafeLinkUrl(parsed.liveDemoUrl) || "",
        repoUrl: sanitizeSafeLinkUrl(parsed.repoUrl) || "",
        assetKey: parsed.assetKey || undefined,
        published: parsed.published !== false,
      };
    } catch {
      return { summary: raw, itemKind: "work", pillar: "full-stack", published: true };
    }
  }
  return { summary: raw, itemKind: "work", pillar: "full-stack", published: true };
}

export function mapRowToShowcaseProject(row: PortfolioRow): ShowcaseProject {
  const meta = decodePortfolioDescription(row.description);
  const pillar: ProjectPillar = meta.pillar || "full-stack";
  const itemKind: ProjectKind = meta.itemKind || "work";
  const defaultPrefix =
    itemKind === "case-study" ? "Case Study" : PILLAR_LABELS[pillar];
  const fallbackCategory =
    itemKind === "case-study"
      ? `Case Study · ${meta.clientType || PILLAR_LABELS[pillar]}`
      : `${defaultPrefix} · Client Delivery`;

  return {
    id: row.id,
    seedKey: meta.seedKey,
    itemKind,
    title: row.title,
    pillar,
    categoryLabel: meta.categoryLabel || fallbackCategory,
    clientType: meta.clientType || "Custom Engagement",
    summary: meta.summary || "Production delivery managed via Glynova CMS.",
    challenge:
      meta.challenge ||
      meta.summary ||
      "Built to replace fragmented workflows and deliver measurable operational and revenue scale.",
    architecture:
      meta.architecture ||
      "Engineered end-to-end with clean data pipelines, automated alerts, and verifiable analytics.",
    outcomeHeadline: meta.outcomeHeadline || "Production Verified",
    stack:
      meta.stack && meta.stack.length > 0
        ? meta.stack
        : [PILLAR_LABELS[pillar]],
    metrics: meta.metrics || [],
    imageUrl: resolvePortfolioImageUrl(row.media_url, meta.assetKey),
    assetKey: meta.assetKey,
    mediaType: (row.type as "image" | "video" | "file") || "image",
    liveDemoUrl: meta.liveDemoUrl || undefined,
    repoUrl: meta.repoUrl || undefined,
    published: meta.published !== false,
    source: "cms",
  };
}

export const RESUME_SEED_KEY = "system-resume-cv";
export const RESUME_RECORD_TITLE = "__GLYNOVA_RESUME_SETTINGS__";

export function isSystemResumeRow(row: PortfolioRow): boolean {
  if (row.title === RESUME_RECORD_TITLE) return true;
  if (row.description?.startsWith("__GLYNOVA_RESUME_V1__")) return true;
  const meta = decodePortfolioDescription(row.description);
  return meta.seedKey === RESUME_SEED_KEY || meta.seedKey === "system-resume-cv";
}

export function buildSeedInsertPayloads(existingRows: PortfolioRow[]) {
  const existingKeys = new Set<string>();
  let maxOrderIndex = -1;

  for (const row of existingRows) {
    if (isSystemResumeRow(row)) continue;
    if (typeof row.order_index === "number" && row.order_index > maxOrderIndex) {
      maxOrderIndex = row.order_index;
    }
    const meta = decodePortfolioDescription(row.description);
    if (meta.seedKey) {
      existingKeys.add(meta.seedKey);
    }
  }

  const missing = ALL_BUILTIN_PROJECTS.filter(
    (item) => item.seedKey && !existingKeys.has(item.seedKey)
  );

  return missing.map((item, idx) => ({
    title: item.title,
    description: encodePortfolioDescription({
      seedKey: item.seedKey,
      itemKind: item.itemKind,
      pillar: item.pillar,
      categoryLabel: item.categoryLabel,
      clientType: item.clientType,
      summary: item.summary,
      challenge: item.challenge,
      architecture: item.architecture,
      outcomeHeadline: item.outcomeHeadline,
      stack: item.stack,
      metrics: item.metrics,
      liveDemoUrl: item.liveDemoUrl,
      repoUrl: item.repoUrl,
      assetKey: item.assetKey,
      published: true,
    }),
    media_url: item.assetKey ? `builtin:${item.assetKey}` : "",
    type: item.mediaType || "image",
    order_index: maxOrderIndex + 1 + idx,
  }));
}

export interface StackCategory {
  id: string;
  label: string;
  pillarLabel: string;
  summary: string;
  items: { name: string; role: string }[];
}

export const TECH_STACK_CATEGORIES: StackCategory[] = [
  {
    id: "web-apps",
    label: "Full-Stack Web Apps",
    pillarLabel: "Engineering",
    summary: "End-to-end production applications built for speed, clean data modeling, and maintainable scale.",
    items: [
      { name: "React & TypeScript", role: "Interactive interfaces & component systems" },
      { name: "Next.js", role: "SSR, App Router & SEO-ready web platforms" },
      { name: "Node.js & Express", role: "REST APIs, auth flows & background workers" },
      { name: "Supabase & PostgreSQL", role: "Relational schemas, RLS security & real-time" },
    ],
  },
  {
    id: "business-ops",
    label: "Business Ops Systems",
    pillarLabel: "Operations",
    summary: "Internal systems that replace fragmented spreadsheets with automated CRM, ERP, and team workflows.",
    items: [
      { name: "Custom CRM Pipelines", role: "Lead scoring, SLA routing & deal tracking" },
      { name: "Lightweight ERP Modules", role: "Orders, inventory, billing & fulfillment sync" },
      { name: "Workflow Automation", role: "Cross-app triggers with n8n, Make & custom jobs" },
      { name: "Executive Dashboards", role: "Live margin, utilization & cashflow telemetry" },
    ],
  },
  {
    id: "paid-media",
    label: "Paid Media Funnels",
    pillarLabel: "Acquisition",
    summary: "Data-backed acquisition campaigns wired directly to server-side attribution and conversion pages.",
    items: [
      { name: "Meta Ads & CAPI", role: "Creative testing matrices & server-side tracking" },
      { name: "Google Search & PMax", role: "High-intent demand capture & offline conv. sync" },
      { name: "TikTok Ads", role: "Short-form performance hooks & rapid creative loops" },
      { name: "Conversion Engineering", role: "Custom high-speed landing & checkout flows" },
    ],
  },
  {
    id: "ai-integrations",
    label: "AI Agents & Custom APIs",
    pillarLabel: "Automation",
    summary: "Autonomous lead qualification, omnichannel webhooks, and third-party API bridges that work 24/7.",
    items: [
      { name: "AI Qualification Agents", role: "Automated chat & lead triage across web/social" },
      { name: "Webhook Orchestration", role: "Reliable event pipelines with retries & logging" },
      { name: "Meta / WhatsApp APIs", role: "Unified inbox routing & automated DM capture" },
      { name: "Payment & Calendar APIs", role: "Stripe billing webhooks & instant scheduling" },
    ],
  },
];
