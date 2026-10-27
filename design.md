# Design — SPPG Bandung Raya & Monitoring Kejadian

A locked design system for this app. Every page redesign reads this file before emitting code. Do not regenerate per page — extend or amend this file when the system needs to grow.

## Genre
modern-minimal (Sleek dark command center / telemetry dashboard)

## Macrostructure family
Workbench (Side navigation rail + high-utility overview telemetry + interactive Leaflet GIS view + data tables with filter & detail views)

- Marketing/Overview: Workbench dashboard with stat cards and telemetry charts
- App/GIS page: Interactive map with custom high-contrast SVG markers & popups
- Incident Management: Real-time incident list, multi-criteria filtering, and incident report modal
- Directory page: SPPG Cards and data grid with quick pan-to-map integration

## Theme
- `--color-paper`: oklch(14% 0.012 255)
- `--color-paper-2`: oklch(18% 0.016 255)
- `--color-paper-3`: oklch(22% 0.020 255)
- `--color-paper-card`: oklch(19% 0.018 255)
- `--color-ink`: oklch(97% 0.005 255)
- `--color-ink-2`: oklch(78% 0.015 255)
- `--color-rule`: oklch(27% 0.018 255 / 0.65)
- `--color-accent`: oklch(62% 0.20 250) (Electric Cobalt)
- `--color-status-success`: oklch(68% 0.19 146) (Emerald Active)
- `--color-status-warning`: oklch(76% 0.17 78) (Amber Attention)
- `--color-status-danger`: oklch(63% 0.23 27) (Crimson Incident)
- `--color-focus`: oklch(68% 0.18 250)

## Typography
- Display: Plus Jakarta Sans, weight 700, style normal (no italic headers)
- Body: Inter, weight 400 / 500 / 600
- Mono: JetBrains Mono / ui-monospace
- Display tracking: -0.025em
- Type scale anchor: 4pt scale

## Spacing
4-point named scale defined in `tokens.css`.

## Motion
- Easings: cubic-bezier(0.16, 1, 0.3, 1) (`--ease-out`)
- Reduced-motion fallback: opacity-only, <= 150 ms
- Microinteractions: silent success, optimistic updates, instant focus ring

## CTA voice
- Primary CTA: Solid cobalt pill/rounded button (`bg-accent text-white hover:brightness-110 active:scale-[0.98]`)
- Secondary CTA: Crisp bordered button (`border border-white/10 hover:bg-white/5 active:scale-[0.98]`)
- Icon buttons: Subtle hover highlight with tooltip

## Exports
See `tokens.css` for source custom properties.
