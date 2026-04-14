

## Fix Hero Section Vertical Spacing

### Issue Analysis
The HeroSection has excessive empty space because:
- `min-h-screen` makes the section full viewport height
- `flex items-center` centers content vertically in that full height
- `pt-16` (64px) adds top padding to clear the fixed navbar
- Combined, this pushes content far down from the navbar

### Solution
1. **Change `items-center` to `items-start`** — aligns content to the top instead of centering
2. **Keep `pt-16`** — maintains clearance for the 64px fixed navbar
3. **Add `pb-16`** — balanced bottom padding
4. **Remove `min-h-screen` or reduce it** — allows section to be content-height rather than forcing full viewport height

### Files to Edit
- `src/components/HeroSection.tsx` — adjust flex alignment and padding classes

### Changes
Line 14: Change from:
```tsx
<section className="relative min-h-screen flex items-center pt-16 overflow-hidden" style={{ backgroundImage: "var(--gradient-hero)" }}>
```
To:
```tsx
<section className="relative min-h-[80vh] flex items-start pt-24 pb-16 overflow-hidden" style={{ backgroundImage: "var(--gradient-hero)" }}>
```

This:
- Reduces height from `min-h-screen` (100vh) to `min-h-[80vh]` (80vh) — less vertical sprawl
- Changes `items-center` to `items-start` — content sits at top, not centered
- Increases top padding from `pt-16` to `pt-24` (96px) — better clearance for navbar + breathing room
- Adds `pb-16` — balanced bottom spacing

