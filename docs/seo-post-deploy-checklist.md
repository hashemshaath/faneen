# SEO Post-Deploy Checklist

Run this after every production publish to confirm crawlers see the
intended state of Qitaat.

## 1. Deploy the latest build
- Publish from Lovable so `qitaat.com` serves the latest bundle.
- Wait ~60s for CDN propagation.

## 2. Run the automated verifier
```
npm run seo:post-deploy
# or against a different host:
node scripts/seo-post-deploy-verify.mjs --base https://qitaat.com
```
The script asserts: 200 status, `<title>`, meta description, canonical,
`og:title|description|image`, robots meta, JSON-LD parseability, no
UUIDs in canonicals, and sitemap inclusion/exclusion rules.

## 3. Trigger an SEO rescan
Open **SEO & AI search** → Rescan. This refreshes Lighthouse + lint
findings against the freshly deployed build (LCP and contrast fixes
only register after a publish + rescan).

## 4. Approve Google Search Console OAuth
- Connectors → Google Search Console → Connect.
- This is a **manual user step**; the agent cannot complete OAuth.
- After approval, GSC findings move from "needs auth" to live data.

## 5. Verify Lighthouse LCP
- Open the latest Lighthouse report.
- Confirm LCP < 2.5s on `/`.
- Hero image preload + `font-display: swap` are already in source — a
  fresh build should clear the previous regression.

## 6. Verify Lighthouse contrast
- All text uses semantic tokens (`text-foreground`,
  `text-muted-foreground`). Confirm no contrast warnings remain.

## 7. Verify sitemap
- `https://qitaat.com/sitemap.xml` returns 200 and includes public
  routes (`/`, `/search`, `/help`, help articles, published provider
  pages).
- Private/token URLs (`/q/:code`, `/client/:refId`, dashboard, admin)
  MUST NOT appear.

## 8. Verify robots.txt
- `https://qitaat.com/robots.txt` returns 200.
- Disallows `/admin`, `/dashboard`, `/q/`, `/client/`.
- Declares the sitemap URL.

## 9. Verify JSON-LD
- View source on `/`, `/help`, and an article page.
- Each `<script type="application/ld+json">` block parses as valid
  JSON.
- Article pages emit `Article` + `BreadcrumbList`. Category pages
  emit `BreadcrumbList` + `ItemList`. Home emits `CollectionPage` +
  `BreadcrumbList`.

## Out of scope (do not change)
- RLS policies
- Provider publishing rules
- Customer token security model
- Private page indexing rules (always noindex)