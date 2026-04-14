

## Fix Empty Gap Between Hero and About Sections

### Root Cause
The hero section uses `min-h-[80vh]` which forces it to be at least 80% of viewport height. On mobile, the hero content is shorter than this minimum, leaving a large empty gap at the bottom before the About section.

### Fix
In `src/components/HeroSection.tsx` line 14, change the min-height to be responsive:

```tsx
// From:
<section className="relative min-h-[80vh] flex items-start pt-24 pb-16 overflow-hidden" ...>

// To:
<section className="relative min-h-0 md:min-h-[80vh] flex items-start pt-24 pb-16 overflow-hidden" ...>
```

This removes the minimum height constraint on mobile (content determines height) while keeping the 80vh minimum on desktop where there's enough content to fill it.

### Files
- `src/components/HeroSection.tsx` — one class change on line 14

