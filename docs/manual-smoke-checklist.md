# Qitaat — Manual Production Smoke Checklist

Run before each promotion to production. Each step is a human pass; automated
coverage lives in vitest + isolation audits.

## 1. Auth
- [ ] Phone OTP signup → login → no `@phone.qitaat.local` shown anywhere in UI.
- [ ] Email + password login.
- [ ] Google OAuth (if enabled) round-trip.
- [ ] Profile settings show official email (or "Not provided").

## 2. Onboarding
- [ ] New user reaches the 3-step onboarding wizard.
- [ ] Entity (business) creation succeeds.
- [ ] New business displays `ENT-…` as primary reference (BIZ shown only as
      "previous ID" hint when present).

## 3. Membership / Payment
- [ ] `/membership` paid plan checkout starts (Moyasar sandbox).
- [ ] `createMembershipPaymentIntent` returns an intent with a `PAY-…` ref.
- [ ] `/admin/membership-payments` shows PAY + working `/r/PAY-…` copy link.
- [ ] `provider_intent_id` only visible in the admin secondary column.
- [ ] User payment history (`/membership/payments`) shows PAY only.
- [ ] Invoice route renders for a succeeded payment.
- [ ] Paid / refunded email contains PAY ref and `/r/PAY-…` button.

## 4. Reference resolver
- [ ] `/r/ENT-…` resolves to the business profile or shows safe unavailable.
- [ ] `/r/PAY-…` resolves to the invoice (succeeded/refunded) or `/membership`.
- [ ] `/r/random-token` shows the safe unavailable copy (no crash, no UUID).
- [ ] A raw UUID is rejected by the resolver pattern.

## 5. Admin core
- [ ] `/admin/membership-payments`
- [ ] `/admin/businesses` (ENT primary + BIZ hint)
- [ ] `/admin/barcode-registry`
- [ ] `/admin/cron-runs` (recent rows present, no duplicate jobs)
- [ ] Sidebar links all navigate (no 404).

## 6. Public
- [ ] `/`, `/marketplace`, business profile by slug, `/about`, `/contact`.
- [ ] Legal pages render.
- [ ] `/robots.txt`, `/sitemap.xml`, `/llms.txt` return 200.
- [ ] Hard refresh on a deep public route does not 404.

## 7. Notifications / Email
- [ ] Contact form sends acknowledgement (transactional).
- [ ] In-app notification for paid/refunded payment has `action_url`
      pointing at `/r/PAY-…` when PAY exists.
- [ ] No `provider_intent_id` value appears in any user template.

## 8. Cron
- [ ] `cron_run_log` has rows from the last 24h.
- [ ] Membership lifecycle, prune, and reconcile jobs are all active.

## Sign-off
- Tester: ______________________
- Build:  ______________________
- Date:   ______________________
- Result: PASS / FAIL (attach notes)