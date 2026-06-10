---
name: Verified Badge Standard
description: Unified <VerifiedBadge> — Twitter/X blue BadgeCheck, ICON ONLY (no "موثقة"/"Verified" text), xs/sm/md sizes. Unverified state on profile shows "مطالبة بالحساب" CTA + info tooltip via VerificationStatusBadge.
type: design
---
- Verified mark = Twitter/X style: `BadgeCheck` lucide icon, color `#1D9BF0`, fill `#1D9BF0/15`. Always icon-only — never render the words "موثقة" / "Verified" next to it. Accessible name via `aria-label`/`title` on a wrapping span.
- Sizes: xs (w-3.5), sm (w-4), md (w-5). `iconOnly` prop kept for back-compat but ignored.
- Public profile unverified state: `<VerificationStatusBadge isVerified={...} businessId={...} />` renders a "مطالبة بالحساب" (Claim this business) link to `/claim/:id` + an Info tooltip with help text. Owner view still routes to `/dashboard/badge` with "اطلب التوثيق".
- The standalone `BusinessProfileTrustStrip` (جهة موثّقة / بيانات مراجعة قبل النشر / claim CTA) was removed — do NOT re-introduce it.
- Never use `ShieldCheck`, `CheckCircle2`, or ✓ glyph for the verified mark.