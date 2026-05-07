# Qitaat.com — Full Audit & Improvement Plan

## 1. Current State Snapshot

Stack: React 18 + Vite 5 + TS strict, Tailwind, React Query, Supabase (Lovable Cloud), PWA, RTL/LTR Arabic-first. Custom domain `qitaat.com`.

What's already strong (keep as-is):
- **SEO**: Edge-function sitemap (7 segments), `usePageMeta`/`useJsonLd`, multi JSON-LD on home (WebSite + Organization + SearchAction), `useNoIndex` on protected routes, robots/canonical/sitemap CI audits, Lighthouse CI, JSON-LD snapshot tests.
- **Security**: RLS everywhere, `has_role`/`has_admin_access` security-definer pattern, `access_violation_log` + auto-notify trigger, password reset rate limiting, `search_path` isolation, public data masking via `get_public_business_data`, DOMPurify, secret scanning in CI.
- **Auth**: OTP, JWT rotation, react-hook-form + zod, lockout hook, social/Google, onboarding wizard.
- **Email**: Mailgun webhooks → suppressed, deliverability stats RPC, alerts, realtime admin panel, transactional templates with List-Unsubscribe.
- **Perf**: Manual chunks, lazy routes with `lazyRetry`, `cv-auto`, WebP <80KB, web-vitals RUM ingest, PWA cache strategies.
- **i18n**: `AppDirectionShell`, logical CSS, `dir="auto"` inputs, `.tech-content` LTR override.

## 2. Audit Findings (Issues to Fix)

| # | Area | Finding | Severity |
|---|------|---------|----------|
| F1 | Hosting | `public/_redirects` is a Netlify file — no effect on Lovable hosting; misleading | Low |
| F2 | Sitemap | `public/sitemap.xml` hard-codes `hckpxwhjycmdflaneihd.supabase.co` instead of `qitaat.com/functions/v1/sitemap` — splits canonical signal | **High (SEO)** |
| F3 | Security headers | No CSP / X-Frame / Referrer-Policy / Permissions-Policy meta in `index.html` | Med |
| F4 | AI-search readiness | `public/llms.txt` exists but not verified for completeness; no `ai.txt`; no per-page `<meta name="robots" content="max-snippet:-1, max-image-preview:large">` | Med |
| F5 | Schema.org coverage | Home has WebSite+Org; need BreadcrumbList everywhere, LocalBusiness on business profiles, Article on blog (verify), FAQPage on contact/about | Med |
| F6 | Hreflang | Arabic-first but no `<link rel="alternate" hreflang="ar/en/x-default">` emitted from `usePageMeta` | Med |
| F7 | Mobile | Confirm 44px tap targets across new admin pages (`AdminEmailDeliverability`); check `xs` (360px) breakpoint usage | Low |
| F8 | Landing | `HeroSection` + 9 lazy sections — verify LCP element preload, font preconnect, no CLS from particles | Med |
| F9 | Onboarding (suppliers) | 3-step wizard exists; audit completion rate signals, add "save & resume", clearer industry picker, pre-fill from category | Med |
| F10 | Scalability | Some legacy direct Supabase calls in pages — gradual migration to `businessService.ts` (per memory) | Low (ongoing) |
| F11 | Code cleanliness | TS `any` audit (memory says zero); ESLint warnings ≤50 in CI — tighten to 0 | Low |
| F12 | A11y | Verify focus rings, ARIA landmarks on new admin/dashboard pages | Low |

## 3. Implementation Plan (Phased, Non-Breaking)

### Phase 1 — Quick SEO & AI-search wins (this PR)
1. Fix `public/sitemap.xml` to point to `https://qitaat.com/functions/v1/sitemap?type=...` (canonical host).
2. Remove obsolete `public/_redirects` (Lovable handles SPA fallback).
3. Add security & AI-friendly meta to `index.html`: `Referrer-Policy`, `X-Content-Type-Options`, `Permissions-Policy`, `robots` with `max-snippet:-1, max-image-preview:large, max-video-preview:-1`.
4. Extend `usePageMeta` to emit `hreflang` (ar / en / x-default) and `og:locale` / `og:locale:alternate`.
5. Verify/extend `public/llms.txt` with sitemap + key sections + contact.

### Phase 2 — Schema.org expansion
6. Add `BreadcrumbList` JSON-LD helper, wire into Search/Categories/BusinessProfile/BlogPost/ProjectDetail.
7. Add `LocalBusiness` JSON-LD on `BusinessProfile` (name, address, geo, telephone, openingHours, aggregateRating).
8. Add `FAQPage` JSON-LD on About/Contact if FAQ content exists.

### Phase 3 — Landing page & CWV
9. Preconnect to Supabase + fonts in `index.html`; preload hero image.
10. Audit `HeroParticles` for `prefers-reduced-motion` (memory says guarded — verify).
11. Add `fetchpriority="high"` to LCP image, `loading="lazy"` + `decoding="async"` elsewhere.

### Phase 4 — Supplier onboarding polish
12. Add progress persistence (localStorage `qitaat_onboarding_draft`) + resume banner.
13. Industry picker: visual category grid (already have 7 sectors) instead of dropdown.
14. Inline validation w/ helpful Arabic copy; success microcopy.

### Phase 5 — Code health & scalability
15. Run `tsc --noEmit` + ESLint and burn down warnings to 0.
16. Continue gradual migration of direct Supabase calls into `businessService.ts`.
17. Add `BUSINESS_SERVICE.md` short doc on the migration policy.

### Phase 6 — Mobile & A11y sweep
18. Audit new admin pages for 44px targets, focus-visible rings, `aria-label` on icon buttons.
19. Verify `xs` breakpoint (360px) on dashboard cards.

## 4. Non-Goals / Guardrails

- No removal of existing pages, routes, or features.
- No change to auth, RLS, or DB schema unless a finding upgrades to critical.
- No popups/dialogs (per memory).
- No tracking pixels in emails (per prior decision).
- No edits to `src/integrations/supabase/{client,types}.ts` or `.env`.
- Keep IBM Plex Sans Arabic, gold accent, `h-12`/`rounded-xl` baseline.

## 5. Technical Notes

- Sitemap fix: replace `loc` hosts in `public/sitemap.xml` and ensure GSC submission uses `https://qitaat.com/sitemap.xml` only.
- hreflang: emit two `<link rel="alternate">` + `x-default` based on `useLanguage().language`; canonical stays language-agnostic.
- Breadcrumbs: small `useBreadcrumbJsonLd(items)` hook reusing `useJsonLd`.
- LocalBusiness: derive from `get_public_business_data` RPC already in place.
- `index.html` meta additions are HTML5-safe; no `<noscript><img>` in `<head>` (per directive).

## 6. Rollout Order in This Loop

I'll start with **Phase 1** (4 small, safe, high-impact files) and stop for your review before Phase 2. This keeps each step verifiable and reversible.
