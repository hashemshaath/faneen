# RFQ Conversion Audit — MARKETPLACE-CONVERSION-OPTIMIZATION-1

## Flow snapshot (`/quote`)

- Steps: 3 (Sector & service → Project details → Contact)
- Required fields: sector, city, service type, contact name, contact channel
- Optional: photos, measurements, target date
- Mobile usability: dir-aware inputs, single-column layout

## Friction observed

| # | Friction | Severity |
|---|---|---|
| 1 | Photo upload on mobile (HEIC, large files) | High |
| 2 | Measurements input requires unit awareness | Medium |
| 3 | Contact channel selection visually competes with submit | Low |
| 4 | Country/city dropdown could autodetect | Low |

## Quick Wins (no redesign)

- Inline hint: "Photos are optional — you can add them later."
- Show estimated submission time ("~2 minutes").
- Sticky submit on mobile.

## Medium Wins

- Pre-fill city from `useLandingTracking` UTM / IP region.
- Server-side image compression hint.

## High Impact Wins

- Save-and-resume via tokenized link.
- Match preview before submit ("3 providers in Riyadh match this request").

No redesign in this phase.