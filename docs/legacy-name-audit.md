# Legacy Name / Branding Audit — SUPABASE-GITHUB-DATABASE-DEEP-REPAIR-1

Platform was renamed from **Faneen** → **Qitaat (قِطاعات)**. Earlier transliterations (`Faniyeen`, `Fanyeen`, `Faneyeen`) and Arabic `فنيين` were also swept.

## Repo-wide sweep

| Token | Matches outside docs / migrations / mem | Classification |
|-------|----------------------------------------|----------------|
| `Faniyeen` / `Fanyeen` / `Faneyeen` | **0** | clean |
| `Faneen` | **0** in app code | clean |
| `faneen` in `supabase/migrations/` | 4 (3× `localStorage_faneen_to_qitaat` cleanup key, 1× brand-name blocklist row) | historical only — must keep |
| Arabic `فنيين` | **0** | clean |
| Arabic `فني` (standalone) | **0** | clean |
| `Technician(s)` (English, generic word) | 4 file matches in `src/components/sector/SectorTopTechnicians.tsx`, `src/pages/SectorLanding.tsx`, and two test files | product wording for "specialist providers strip" — not legacy branding |

## Classification table

| Finding | Class | Action |
|---------|-------|--------|
| `localStorage_faneen_to_qitaat` migration key in 3 migrations | DB-table-legacy-but-safe | keep — preserves cleanup audit trail |
| `('faneen','brand')` blocklist row in marketing brand-name table | internal-only acceptable | keep — prevents legacy brand re-registration |
| `SectorTopTechnicians.tsx` strings (`Top X technicians`, `أفضل فنيي`) | product wording, not legacy brand | leave — sector pages legitimately surface technician/specialist providers |
| Domain `qitaat.com` / `qitaat.lovable.app` in `project_urls` | current brand | clean |
| Email templates / OG / JSON-LD | scanned via existing audits (`jsonld-parse-audit`, `transactional-email-isolation-audit`) — all reference Qitaat | clean |

## User-facing leaks

**None.** No public-facing surface (UI, email, SEO meta, OG, JSON-LD, sitemap, robots, notifications) carries any Faneen / Faniyeen / فنيين copy.

## DB renames

None required. Migration cleanup keys reference the legacy name string intentionally and must not be renamed.