---
name: Numbers, Codes & Identity Data Policy
description: Latin digits always; codes/refs/identity LTR; tags/helper text follow UI language. Use fmtNum/fmtCurrency/fmtDate from @/lib/format and .tech-content / .num-display classes.
type: preference
---

## Global rule (applies to every page, AR + EN)

- **Numbers**: always Latin/Western digits (`1,200` not `١٬٢٠٠`). Use `fmtNum`, `fmtCompact`, `fmtCurrency`, `fmtDate`, `fmtDateTime` from `@/lib/format`. Never call `toLocaleString('ar-...')` — those helpers force `en-US` for numbers and `ar-SA-u-nu-latn` for dates so digits stay Latin in both languages.
- **Codes / refs / identity** (SKU, RFQ, QT, INV, CR, VAT, IBAN, URL, email, phone, slug, UUID, contract no, membership no, tracking, coupon): always `dir="ltr"` + `.tech-content` class. Never reverse or translate. Surround with translated *labels* but keep the value Latin-LTR.
- **Tags / Badges / Chips / helper text / side labels**: follow UI language (use `<Bi>` / `useBi()`). Never show raw slugs (`aluminum-works`), translation keys, or internal labels.

## Examples
- ✅ `كود المنتج: <span className="tech-content" dir="ltr">SKU-1024</span>`
- ✅ `Product code: SKU-1024`
- ✅ `<Bi ar="موثّق" en="Verified" />`
- ❌ `{count.toLocaleString('ar-SA')}` → use `fmtNum(count)`
- ❌ Showing `aluminum-works` as a chip → look up bilingual label.

## Enforcement
- `src/test/scope-numbers-policy.test.ts` blocks Arabic-Indic digit literals and raw `toLocaleString('ar...')` in public-core pages (Home, Search, Quote, Auth, Onboarding, `src/components/home/**`).
- `src/lib/__tests__/format.policy.test.ts` guards the helpers themselves.
- Phase 5A audit (2026-06): all in-scope pages already comply (no AR digits, no AR-locale number calls, no slug leakage).