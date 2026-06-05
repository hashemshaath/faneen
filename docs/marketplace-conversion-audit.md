# Marketplace Conversion Audit — MARKETPLACE-CONVERSION-OPTIMIZATION-1

_Phase: Conversion optimization only. No new marketplace modules._

## Scope

Audit ten surfaces against four primary conversion goals:

1. Visitor → RFQ
2. Visitor → Provider Signup
3. Provider Signup → Published Provider
4. Published Provider → Lead Generation

## Page-by-page

| # | Page | Primary goal | Secondary | CTA quality | Trust signals | Friction | Abandonment risk |
|---|---|---|---|---|---|---|---|
| 1 | Home (`/`) | Visitor → RFQ | Provider signup | Strong (`FinalCTASection` dual CTA) | Verified, multi-city, no fees | Hero overload on mobile | Mid (long page) |
| 2 | Sectors (`/sectors`, `/sectors/:sector`) | Visitor → Provider profile | RFQ | Medium (CTA below fold) | Sector counts, brand chips | Filter discovery | Low |
| 3 | Provider profile | Visitor → RFQ | Save / share | Strong (sticky CTA) | Verified badge, completeness, brands | Long tabs on mobile | Mid |
| 4 | Products | Visitor → Provider | RFQ | Weak (no inline RFQ) | Brand, price | Cross-link to provider | Mid |
| 5 | Services | Visitor → Provider | RFQ | Medium | Coverage, brand | Limited inline trust | Mid |
| 6 | RFQ flow (`/quote`) | RFQ submitted | Profile draft save | Strong | Privacy note | Multi-step, uploads | High (mobile uploads) |
| 7 | Provider registration (`/auth`) | Provider signup | Onboarding | Strong | OTP, RTL/LTR | OTP delivery | Mid |
| 8 | Onboarding wizard | Business created | Profile completion | Strong (3-step) | Progress bar | Long form | Mid |
| 9 | Dashboard overview | Publication | Verification | Strong (completeness card) | Readiness score | Hidden NBA on mobile | Mid |
| 10 | Search (`/search`) | Visitor → Provider | RFQ | Medium | Counts, badges | Empty-state CTA | Low |

## Cross-cutting findings

- CTA wording is generally specific (no "Click here"). One weak spot: services and product cards lack an inline "Request quote" affordance — only navigate to provider.
- Trust signals exist but are inconsistently placed above the fold across sector vs provider pages.
- Mobile RFQ flow has the highest abandonment risk due to upload friction.

## Conclusions

No new modules are recommended. Recommendations are wording, placement, and
trust-signal-visibility improvements only. See `docs/conversion-funnels.md`,
`docs/trust-signals-audit.md`, `docs/rfq-conversion-audit.md`,
`docs/seo-conversion-audit.md`.