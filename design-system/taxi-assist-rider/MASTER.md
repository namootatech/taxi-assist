# Design System Master File

> **Brand sync (2026-07-14):** Rider now shares the **Trip** visual system with the
> driver app (red `#FE0000`, navy `#244065`, cream `#FFFAF4`, portal dark
> `#07111F` / `#0D1A2D`). See `docs/design-system/` and
> `apps/driver_app/lib/core/theme/app_theme.dart`. Landing lives in
> `apps/rider_app/lib/features/marketing/landing_screen.dart`.

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Taxi Assist Rider
**Generated:** 2026-07-09 13:41:05
**Updated:** 2026-07-14 — Trip brand alignment with driver app
**Category:** Mobility / Trip platform

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary | `#FE0000` | `--color-primary` |
| Secondary | `#244065` | `--color-secondary` |
| Background (light) | `#FFFAF4` | `--color-background` |
| Surface (light) | `#FFFFFF` | `--color-surface` |
| Portal background | `#07111F` | `--color-portal-bg` |
| Portal surface | `#0D1A2D` | `--color-portal-surface` |
| Text | onSurface from ColorScheme | `--color-text` |

### Typography

- **System / Material** with heavy weights (display w900, headlines w800) — same as driver app
- **Mood:** bold, premium, high-contrast, night-ready

### Spacing Variables

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Section padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `64px` / `4rem` | Hero padding |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Cards, buttons |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, dropdowns |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Hero images, featured cards |

---

## Component Specs

### Buttons

```css
/* Primary Button */
.btn-primary {
  background: #FE0000;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-primary:hover {
  filter: brightness(0.92);
}

/* Secondary Button */
.btn-secondary {
  background: transparent;
  color: #244065;
  border: 2px solid #244065;
  padding: 12px 24px;
  border-radius: 14px;
  font-weight: 700;
  transition: all 200ms ease;
  cursor: pointer;
}
```

### Cards

```css
.card {
  background: #FFFFFF;
  border-radius: 18px;
  padding: 24px;
  box-shadow: none;
  border: 1px solid rgba(36, 64, 101, 0.08);
}
```

### Inputs

```css
.input {
  padding: 12px 16px;
  border: 1px solid rgba(36, 64, 101, 0.16);
  border-radius: 14px;
  font-size: 16px;
  transition: border-color 200ms ease;
}

.input:focus {
  border-color: #FE0000;
  outline: none;
  box-shadow: 0 0 0 3px rgba(254, 0, 0, 0.16);
}
```

### Modals

```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 90%;
}
```

---

## Style Guidelines

**Style:** Accessible & Ethical

**Keywords:** High contrast, large text (16px+), keyboard navigation, screen reader friendly, WCAG compliant, focus state, semantic

**Best For:** Government, healthcare, education, inclusive products, large audience, legal compliance, public

**Key Effects:** Clear focus rings (3-4px), ARIA labels, skip links, responsive design, reduced motion, 44x44px touch targets

### Page Pattern

**Pattern Name:** App Store Style Landing

- **Conversion Strategy:** Show real screenshots. Include ratings (4.5+ stars). QR code for mobile. Platform-specific CTAs.
- **CTA Placement:** Download buttons prominent (App Store + Play Store) throughout
- **Section Order:** 1. Hero with device mockup, 2. Screenshots carousel, 3. Features with icons, 4. Reviews/ratings, 5. Download CTAs

---

## Anti-Patterns (Do NOT Use)

- ❌ Playful design
- ❌ Poor security UX
- ❌ AI purple/pink gradients

### Additional Forbidden Patterns

- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150-300ms)
- ❌ **Invisible focus states** — Focus states must be visible for a11y

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile
