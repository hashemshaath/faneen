# Qitaat Design System — Quick Reference

All tokens live in `src/index.css` (`:root` / `.dark`) and are exposed to
Tailwind via `tailwind.config.ts`. Use semantic tokens — never hex/raw HSL.

## Colors
`bg-background`, `text-foreground`, `bg-card`, `bg-primary`, `bg-accent`
(gold), `bg-muted`, `text-muted-foreground`, `bg-success|warning|info|destructive`,
`bg-surface-nav` (Navbar/Footer dark surface).

## Typography (fluid)
`text-fs-2xs … text-fs-display` — clamp-based, respects mobile.
Headings: `.ds-h-display`, `.ds-h1 … .ds-h4`. Body: `.text-body`, `.text-body-sm`,
`.text-caption`, `.text-eyebrow`.

## Spacing
`p-sp-1 … p-sp-20`, `gap-sp-*`, `m-sp-*`. Stack helpers: `.stack-2/3/4/6`,
`.cluster`, `.cluster-3`.

## Radii
`rounded-r-xs/sm/md/lg/xl/2xl/pill`.

## Elevation
`shadow-elev-1 … shadow-elev-4`.

## Icons (Lucide)
Use size classes — **don't pass `size={n}`**:
`<Icon className="ic-sm" />` (xs=14, sm=16, md=18, lg=20, xl=24).
Tailwind utility equivalents: `size-ic-md` etc.

## Controls (buttons / inputs / selects)
- `<Button size="app">` — 44px, default mobile.
- `<Button size="appLg">` — 48px primary CTA.
- `<Button size="appXl">` — 56px hero CTA.
- `<Button size="appIcon">` — 44×44 icon button.
- For raw inputs: add `ctrl-md` / `ctrl-lg` class.

## Cards
Use `.surface` / `.surface-raised` / `.surface-floating` / `.surface-muted`.
Pad with `.card-pad-sm/md/lg` (auto-grows on `sm`).

## Layout
- Page wrapper: `<main className="container-app page-shell">`.
- Long-form (blog): `.container-prose`.
- Sticky app-bar: add `sticky-header` to top nav.
- Bottom-anchored UI: `.safe-min-pb` for iOS home-indicator clearance.

## Z-index
`z-dropdown` (30), `z-sticky` (40), `z-overlay` (50), `z-toast` (60).

## RTL
- Always use logical sides: `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-0`, `end-0`.
- For directional icons (chevrons): add `.rtl-flip`.
- Use `<Bi>` / `useBi()` / `pickBi()` instead of inline `isRTL ? ar : en`.

## Anti-patterns
- ❌ `text-white`, `bg-[#fff]`, hex literals in components.
- ❌ `<Icon size={18} />` — use `className="ic-md"`.
- ❌ Inline `dir`-checks for text — use bilingual primitives.
- ❌ Custom dialogs/popups — use inline forms (UX constraint).
- ❌ `left-*` / `right-*` — use `start-*` / `end-*`.

## Migrating existing code
Refactor opportunistically: when you touch a component, swap raw Tailwind
sizing for tokens. Don't do mass rewrites — Memory rule (Refactoring Policy).