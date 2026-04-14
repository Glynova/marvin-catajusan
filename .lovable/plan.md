

## Fix Remaining Spacing Issues on Mobile

### Findings from Browser Testing

After scrolling through the entire landing page on mobile (375px), here's what was found:

1. **Hero section**: The CTA buttons have `mb-16` (64px) before the stats grid — this creates an unnecessarily large gap on mobile
2. **Section headers**: All sections use `mb-16` on their heading blocks — slightly excessive on mobile screens
3. **Section padding**: Already tightened to `py-14 md:py-20` — this is good
4. **Section-to-section flow**: All sections transition consistently with `section-padding` — no rogue gaps

### Changes

**1. `src/components/HeroSection.tsx`**
- Reduce CTA buttons bottom margin from `mb-16` to `mb-10 md:mb-16` (less gap before stats on mobile)

**2. `src/components/ServicesSection.tsx`, `CaseStudiesSection.tsx`, `ProcessSection.tsx`, `PortfolioSection.tsx`, `TestimonialsSection.tsx`**
- Reduce section header `mb-16` to `mb-10 md:mb-16` across all five sections (tighter on mobile, unchanged on desktop)

These are small, targeted tweaks — no content, color, or layout changes. Just tighter vertical rhythm on mobile.

