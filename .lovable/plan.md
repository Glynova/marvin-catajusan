

## Remove Empty Gap in Hero Section

### Problem
The hero section has `md:min-h-[80vh]` which forces a minimum height of 80% viewport on medium+ screens. When the content is shorter than this minimum, a large empty white space appears between the hero content and the About section. This is visible in the screenshot.

### Fix
In `src/components/HeroSection.tsx`, remove the min-height constraint entirely and let content determine the section height naturally. This works on both mobile and desktop.

**Line 14 — change:**
```tsx
// From:
<section className="relative min-h-0 md:min-h-[80vh] flex items-start pt-24 pb-16 overflow-hidden" ...>

// To:
<section className="relative flex items-start pt-24 pb-16 overflow-hidden" ...>
```

This single change removes `min-h-0 md:min-h-[80vh]`, so the hero section naturally wraps its content on all screen sizes — no forced empty space.

### Files Changed
- `src/components/HeroSection.tsx` — one class change on line 14

