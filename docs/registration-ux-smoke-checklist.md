# Registration UX — Owner Manual Smoke Checklist

Phase: REGISTRATION-UX-FULL-COMPLETE-4

## A. New business onboarding
- [ ] Start onboarding from a fresh account/state.
- [ ] Complete business identity / basic info.
- [ ] Reach `business-sectors` step.
- [ ] Continue advances to `main-location`.
- [ ] Fill name, type, city, address, postal code.
- [ ] `location_type` options exclude all government values.
- [ ] Continue: no hard block if branch creation fails.
- [ ] Warning appears on summary only if branch creation failed.
- [ ] Success path reaches `staff-invite`.

## B. Staff invite shell
- [ ] Bilingual copy clear (AR/EN).
- [ ] Role chips are informational only (Manager/Editor/Viewer).
- [ ] No token text visible.
- [ ] No invitation network call fires.
- [ ] "Skip and continue" completes onboarding.

## C. Verification badge
- [ ] Summary shows `EntityVerificationStatusBadge`.
- [ ] Reflects current approval_status / is_verified.
- [ ] No admin-only data exposed.

## D. Admin access requests
- [ ] Sidebar shows "طلبات الانضمام / Access Requests".
- [ ] Link opens `/admin/entity-access-requests`.
- [ ] Non-admin redirected / forbidden.

## E. Regression smoke
- [ ] Login works.
- [ ] Dashboard loads.
- [ ] Business / provider pages load.
- [ ] Payments / memberships / contracts / barcodes unchanged.
- [ ] Public links / sitemap valid.

## Launch note
Main location can currently only be edited post-onboarding via existing
business branches management surfaces. If a failure warning appears on the
summary, owner should edit the entity from the dashboard to add the branch.
