# Trip Platform design system (extracted)

Built by scanning real CSS and page code, then writing tokens and a static preview alongside this note.

## Scope

| App | Role | Theme |
| --- | --- | --- |
| `apps/trip_website` | Public marketing / Taxi Assist story | Light, warm cream (`#fffaf4`) with navy + red |
| `apps/trip_media_web` | Partner / media portal shell | Dark navy command center |

Brand anchors everywhere: `--brand-red` `#fe0000` and `--brand-navy` `#244065` in both apps' `globals.css`.

## Sources scanned

- `apps/trip_website/app/globals.css` — variables, `@theme inline`, body backdrop, `.surface`, `.focus-ring`
- `apps/trip_media_web/app/globals.css` — portal vars, `.panel`, focus rings
- `apps/trip_website/app/layout.tsx` and `apps/trip_media_web/app/layout.tsx` — Geist + Geist Mono via `next/font`
- `apps/trip_website/app/page.tsx`, `components/site-header.tsx` — layout rhythm and component shapes
- `apps/trip_media_web/app/page.tsx` — portal landing patterns

## Competitors (desk research only)

Step 3 in the originating workflow assumed a browser MCP; this machine did not have that, so nothing here was captured live.

1. Bolt leans hard on green and (post-refresh) Inter, with illustration-heavy marketing. Trip pushes cream paper and red/navy instead of that cooler green-heavy lane.
2. Uber often sticks to stark black/white with local accent tweaks. Trip still uses loud display type and quiet chrome, but the story is explicitly South Africa-first and anchored in red/navy, not monochrome + lime.
3. Regional ride dashboards tend toward dense grids. Trip Media's stacked navy surfaces behave like an ops shell, minus the purple-gradient cliché kit.

Treat the split on purpose: warm editorial marketing in `trip_website`, subdued tooling chrome in `trip_media_web`. Geist plus the two brand colors are what bridges them.

## Why the tokens look like this

Color: Marketing uses `#122033` on cream so it reads warmer than bleach-white SaaS. Red lands on CTAs and small labels instead of drowning the hero. Portal blues calm long sessions; mint `#47d18c` is only for positive status.

Typography: Geist carries the ultra-bold marketing headlines; mono is wired for IDs or code later if you need it. Hero tracking at `tracking-[-0.06em]` already matches shipped landings, so leave it aligned unless you refactor both sites together.

Spacing: Both apps reuse `px-5` widening to `md:px-8`. Write that gutter down as a named token so new routes stop inventing sideways padding. Likewise call out max width: `max-w-7xl` for marketing shells vs `max-w-6xl` for portal content.

Radius / depth: The `2rem` / `1.5rem` radii read as Trip on hero frames and cards. Keep them consistent if you formalize components.

Accessibility: Focus uses `outline: 3px` plus offset everywhere; sanity-check `:focus-visible` on cream versus `#07111f`. Portal muted copy at roughly 66% white needs an explicit contrast pass at `text-xs` on `#0d1a2d` panels.

## Outputs

| Artifact | Purpose |
| --- | --- |
| `design-tokens.json` | Machine-readable consolidation for tooling or Figma |
| `design-preview.html` | Static swatches and type strips with a marketing/portal toggle |

## Mode 2 snapshot audit (abbreviated)

| Dimension | Score (0–10) | Note |
| --- | ---: | --- |
| Colour consistency | 8 | Shared brand vars; some hard-coded `text-slate-*` / `green-*` in portal preview cards should move onto tokens |
| Typography hierarchy | 8 | Clear h1 / h2 / h3 stack plus eyebrows |
| Spacing rhythm | 7 | Tailwind scale sticks; radius occasionally one-off |
| Component consistency | 7 | `.surface` vs `.panel` differs by app, which is fine if documented |
| Responsive | 7 | Breakpoints show up; double-check midsize widths |
| Dark mode | N/A | Portal is intentionally dark-only; marketing stays light-only |
| Animation | 6 | Mostly `scroll-behavior`; room for deliberate load choreography later |
| A11y | 7 | Rings exist; muted copy still needs measurable contrast proof |
| Density | 8 | Marketing stays airy; portal sits in the middle |
| Polish | 7 | Hover is thin on some links; loading and empty states still open |

## Mode 3 slop check

- No purple-on-white hero gradient. Gradients are a light red wash plus a neutral vertical blend tied to brand.
- Glassy header on marketing is blur + translucent cream for a sticky nav, not decoration for its own sake.
- Hero uses real photography with a caption, not stock abstract blobs.
- Font stack is Geist on purpose, not yet another drop-in Inter pass.

## Next steps

1. Replace hard-coded `text-slate-600`, `green-100`, and similar in `trip_media_web/app/page.tsx` with variables or theme tokens.
2. If the two apps must stay matched, move shared primitives into something like `packages/ui-tokens` or a shared `globals` partial.
3. Run axe or hand-check contrast on portal muted text and white-on-navy buttons.
