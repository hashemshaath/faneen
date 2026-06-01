# Internal Linking Audit — UX-REDESIGN-7

_Phase: UX-REDESIGN-7 / Part F_

## Link graph (after this phase)

| From → To | Status |
|---|---|
| Blog → Blog (related, latest, popular) | ✅ existing |
| Blog → Quote | ✅ end-of-article CTA (UX-REDESIGN-6) |
| Blog → Sectors | ✅ end-of-article CTA (UX-REDESIGN-6) |
| Blog → Help | ✅ added this phase (contextual block) |
| Help → Help (related, prev/next) | ✅ existing |
| Help → Dashboard / Public product routes | ✅ added this phase (NBA card) |
| Help → Quote / Sectors / Contact | ✅ via NBA defaults |
| Sectors → Brands | ✅ UX-REDESIGN-5 |
| Brand → Providers | ✅ UX-REDESIGN-4 / 5 |
| Brand → Sectors | ✅ UX-REDESIGN-5 |
| Provider → Brands / Projects | ✅ UX-REDESIGN-2 / 4 |
| Onboarding → Help | ✅ floating launcher (`HelpLauncherFloating`) |

## Dead-end audit

- Help article with no NBA: **none** (default → `/sectors`).
- Blog post with no exit beyond comments: **none** (CTA + related help).
- Empty discovery pages: handled in UX-REDESIGN-5/6 with recovery cards.

## Orphan audit

- Help articles not reachable from any public surface: still reachable
  via `/help` home and contextual launcher; the Blog → Help block makes
  the operational/how-to articles discoverable from public reads.
- Blog posts orphaned (no inbound links): none — every post is
  reachable from `/blog`, related-posts blocks, sitemap.xml.

## Constraints respected

- No `/admin/*` link from a public surface.
- No `/dashboard/*` link from a public surface other than the explicit
  provider growth funnel (`/for-providers`).
- All new links are RTL/LTR safe (use logical `Link` + Tailwind logical
  classes).