# Qitaat Design System Tokens (RTL-aware)

Additive layer on top of existing styles. Use for new code; existing components keep working.

## Typography (fluid)
Tailwind: `text-fs-2xs|xs|sm|base|md|lg|xl|2xl|3xl|display`
Semantic: `ds-h-display ds-h1 ds-h2 ds-h3 ds-h4 text-eyebrow text-body text-body-sm text-caption`

## Spacing (extends scale)
`sp-1 sp-2 sp-3 sp-4 sp-5 sp-6 sp-8 sp-10 sp-12 sp-16 sp-20`
Use with any utility: `p-sp-4 ms-sp-2 gap-sp-3 ps-sp-4 pe-sp-4` (RTL-aware via Tailwind's `ms/me/ps/pe`).

## Radii
`rounded-r-xs|sm|md|lg|xl|2xl|pill`

## Elevation
`shadow-elev-1 .. shadow-elev-4`

## Surface primitives
`surface | surface-raised | surface-floating | surface-muted`

## Buttons (DS classes — alternative to shadcn `<Button>`)
`btn-ds btn-ds-sm|md|lg btn-primary|btn-secondary|btn-outline-ds|btn-ghost-ds`

## Layout helpers
`stack-2|3|4|6` (margin-block-start), `cluster | cluster-3`, `section-ds`,
`pad-inline | pad-block | pad-block-lg`

## Motion
`duration-fast|base|slow`, `ease-standard|emphasized`

## Z-index
`z-dropdown | z-sticky | z-overlay | z-toast`

## Semantic colors
`bg-success bg-warning bg-info` (+ matching `*-foreground`)

## Policy
- Non-breaking; no forced mass refactor.
- New components MUST use these tokens.
- When editing a file, swap ad-hoc px/rem values for tokens opportunistically.
- All directional spacing must use logical Tailwind classes (`ms/me/ps/pe`) — never `ml/mr/pl/pr`.
