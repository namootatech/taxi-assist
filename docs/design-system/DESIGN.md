# Trip Platform — design system (extracted)

Generated per **Design System** skill — Mode 1: scan codebase → tokenize → document → preview.

## Scope

| App | Role | Theme |
| --- | --- | --- |
| `apps/trip_website` | Public marketing / Taxi Assist story | Light, warm cream (`#fffaf4`) with navy + red |
| `apps/trip_media_web` | Partner / media portal shell | Dark navy command center |

Shared brand anchors: **`--brand-red` `#fe0000`**, **`--brand-navy` `#244065`** (defined in both `globals.css` files).

## Sources scanned

- `apps/trip_website/app/globals.css` — CSS variables, `@theme inline`, body atmosphere, `.surface`, `.focus-ring`
- `apps/trip_media_web/app/globals.css` — portal variables, `.panel`, focus treatment
- `apps/trip_website/app/layout.tsx` — Geist + Geist Mono via `next/font`
- `apps/trip_media_web/app/layout.tsx` — same font stack
- `apps/trip_website/app/page.tsx`, `components/site-header.tsx` — composition, spacing, component recipes
- `apps/trip_media_web/app/page.tsx` — portal landing patterns

## Competitive orientation (desktop research, not live capture)

Skill step 3 referenced industry patterns; **browser MCP was not available** in this environment, so this section is desk research only:

1. **Bolt** — category leader; strong single accent (green), Inter after 2024 refresh, illustration-led marketing. Trip differentiates with **warm paper/cream marketing** vs Bolt’s cooler green-forward system.
2. **Uber** — high-contrast black/white framing with localized accents; Trip aligns on **bold display type + restrained UI chrome**, but uses **SA-local copy** and **red/navy** instead of monochrome + green.
3. **InDrive / regional ride apps** — often dense utilitarian dashboards; Trip Media’s **dark layered surfaces** (`--surface`, `--surface-2`) echo “operations console” clarity without adopting generic purple-gradient tropes.

**Takeaway:** Keep **dual identity** deliberate: editorial warm marketing (`trip_website`) vs focused dark tooling (`trip_media_web`), unified by Geist + red/navy.

## Token rationale

### Colour

- **Cream/paper background + ink foreground** (`#122033`) on marketing: approachable, avoids sterile pure-white SaaS default.
- **Brand red** sparingly on CTAs and labels: aligns with Taxi Assist urgency without painting entire heroes red.
- **Portal deep blues** reduce eye strain for longer sessions; **success mint** `#47d18c` reserved for positive states inside product chrome.

### Typography

- **Geist** pair gives modern neutral grotesque suitable for **heavy `font-black` marketing** headlines; mono available for codes/IDs later.
- Tight negative tracking on heroes (`tracking-[-0.06em]`) matches current landing pages — keep consistent for brand voice.

### Spacing & layout

- **Horizontal rhythm** `px-5` → `md:px-8` is consistent across both apps — promote to documented page gutter tokens.
- **max-w-7xl** vs **max-w-6xl**: tighten naming (“marketing container” vs “app container”) so new pages don’t invent arbitrary widths.

### Radius & depth

- **Large radii** (`2rem`, `1.5rem`) are a recognizable Trip motif on cards and hero media — preserve for component library consistency.

### Accessibility notes

- Focus rings rely on **`outline: 3px solid` + offset** — good baseline; verify contrast on `:focus-visible` against both cream and `#07111f` backgrounds in a future QA pass.
- Portal **muted text** at 66% white: check WCAG against `#0d1a2d` panels for smallest sizes (`text-xs`).

## Outputs

| Artifact | Purpose |
| --- | --- |
| `design-tokens.json` | Machine-readable consolidation for tooling / Figma Variables import pipelines |
| `design-preview.html` | Self-contained swatch + type + component strip (light/dark toggle) |

## Mode 2 — snapshot audit (abbreviated)

| Dimension | Score (0–10) | Note |
| --- | ---: | --- |
| Colour consistency | 8 | Shared brand vars; some hard-coded `text-slate-*` / `green-*` in portal preview cards — align to tokens |
| Typography hierarchy | 8 | Clear h1/h2/h3 + eyebrow pattern |
| Spacing rhythm | 7 | Tailwind scale used well; a few one-off radii |
| Component consistency | 7 | `.surface` vs `.panel` split by app — document as intentional |
| Responsive | 7 | Breakpoint usage present; verify tablet in-between |
| Dark mode | N/A | Only portal is dark; marketing is light-only by design |
| Animation | 6 | Minimal; `scroll-behavior` only — room for purposeful load staging |
| A11y | 7 | Focus rings; needs contrast audit on muted |
| Density | 8 | Marketing airy; portal balanced |
| Polish | 7 | Hover states partial on links; loading/empty TBD |

## Mode 3 — slop check

- **Gratuitous purple gradients:** not present; gradients are **red wash + neutral vertical blend** tied to brand.
- **Generic glass cards:** marketing header uses **blur + translucent cream** with purpose (sticky nav); acceptable.
- **Stock hero trope:** real photography in figure + caption — good.
- **Random Inter stack:** avoided — **Geist** is the deliberate choice.

## Recommended next steps

1. Replace hard-coded `text-slate-600`, `green-100`, etc. in `trip_media_web/app/page.tsx` with CSS variables or Tailwind theme extensions.
2. Add shared `packages/ui-tokens` or re-export tokens from one `globals` partial if both apps should stay in lockstep.
3. Run a formal contrast audit (axe / manual) on portal muted text and white-on-navy buttons.
