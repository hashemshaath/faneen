# Pro upgrade — `/dashboard/badge`

Turn the current single-scroll page into a focused, tabbed workspace with a hero header, deeper customization, real charts, and shareable export tools — without any popups (inline only, per project UX rule).

## 1. New layout

- **Hero header** (glassmorphism, brand green): workshop name, verification pill, live counters (impressions today / clicks today / CTR), and a quick-copy "profile link" chip with QR icon.
- **Tabs** (sticky, semantic tokens):
  1. `Generator` — variant + customization + live preview + HTML/MD/JSX/iframe snippets
  2. `Analytics` — KPI grid + 30-day sparkline charts + top referrers + funnel + recent activity
  3. `Share & Distribute` — QR code, social share (WhatsApp / X / LinkedIn), email signature template, downloadable SVG
  4. `Playbook` — usage tips + checklist + goal tracker

## 2. Generator tab — pro customization

- Style picker: `Light`, `Dark`, `Compact`, **new** `Gradient`, **new** `Minimal`.
- Size picker: `sm / md / lg` (affects padding + icon size in generated SVG).
- Toggles: show sub-label, force LTR/RTL independent of UI language, accent color (preset swatches: emerald default, brand green, blue, slate).
- Live preview rendered on **two canvases** (light bg + dark bg) so users see real-world contrast.
- Snippet tabs inside the card: `HTML`, `Markdown`, `JSX/React`, `iframe`, `SVG download`.
- All snippets carry `?ref=badge` and the existing UTM params for attribution continuity.

## 3. Analytics tab — real charts

- 4 KPI cards: Impressions / Clicks / CTR / Bookings (with delta vs previous period).
- **30-day Recharts area chart** for impressions vs clicks (already have data, just bucket by day).
- Top referrers list (existing) + **new** Top source pages from `conversions.source_page`.
- Funnel block (existing, polished with brand tokens).
- Recent activity feed: last 15 events merged from clicks + conversions, with relative time.
- CSV export button for clicks and conversions (client-side blob, no backend).

## 4. Share & Distribute tab

- QR code (using `qrcode` if already installed, else inline SVG) of the profile link — printable for flyers / business cards.
- Social share buttons (WhatsApp, X, LinkedIn, Email) with prefilled text.
- Email signature HTML block (compact variant + tagline) with one-click copy.
- Direct SVG download of the badge for print materials.

## 5. Playbook tab

- Existing tips list, expanded with category icons.
- **Goal tracker**: monthly impressions/clicks targets with progress bars (saved to `localStorage` under `qitaat_badge_goals_<bizId>`).
- Verification CTA when `is_verified=false`, linking to verification flow.

## Technical notes

- New tabs use shadcn `Tabs` component; sticky inside `max-w-6xl` container (widen from `max-w-5xl`).
- Charts via Recharts (already in project) — no new deps. Reuse `useQuery` data; bucket per day in `useMemo`.
- QR via inline SVG generator (no dep) or `qrcode` if present.
- Strict zero `any`. Errors caught as `unknown` + `instanceof Error`.
- All colors via semantic tokens + brand variants from `mem://brand/identity-v1`.
- VerifiedBadge uses unified `<VerifiedBadge>` component (`mem://style/verified-badge-standard`).
- No dialogs/modals — every flow stays inline (project UX rule).
- RTL/LTR via existing `useLanguage` + `<Bi>` primitives where applicable.
- `useNoIndex` retained.

## Files

- Edit: `src/pages/dashboard/DashboardBadge.tsx` (refactor into tabs, hero, charts).
- New helper: `src/lib/badge/snippets.ts` (extract `buildBadgeHtml` + add `buildJsx`, `buildIframe`, `buildEmailSignature`).
- New helper: `src/lib/badge/qr.ts` (tiny SVG QR generator wrapper).
- New helper: `src/lib/badge/csv.ts` (clicks/conversions CSV export).

## Out of scope

- Backend/RLS changes (already correct).
- Migration of attribution logic (unchanged).
- New tracking events.
