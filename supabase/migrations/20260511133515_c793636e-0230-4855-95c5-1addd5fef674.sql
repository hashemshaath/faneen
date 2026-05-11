-- Phase M1 — Membership limits key normalization (data-only)
-- Backward-compatible: rename keys, drop one redundant duplicate, convert -1→0 sentinel.

UPDATE public.membership_plans
SET limits = (
  -- Strip old keys
  (limits - 'verified_badge' - 'analytics' - 'max_portfolio')
  -- Add canonical replacements (only if old key existed)
  || CASE WHEN limits ? 'verified_badge'
       THEN jsonb_build_object('profile_badge', (limits->>'verified_badge')::boolean)
       ELSE '{}'::jsonb END
  || CASE WHEN limits ? 'analytics'
       THEN jsonb_build_object('analytics_enabled', (limits->>'analytics')::boolean)
       ELSE '{}'::jsonb END
);

-- Convert -1 → 0 (canonical unlimited sentinel) for known number fields
UPDATE public.membership_plans
SET limits = jsonb_set(limits, '{max_projects}', '0'::jsonb)
WHERE (limits->>'max_projects') = '-1';

UPDATE public.membership_plans
SET limits = jsonb_set(limits, '{max_services}', '0'::jsonb)
WHERE (limits->>'max_services') = '-1';

UPDATE public.membership_plans
SET limits = jsonb_set(limits, '{max_promotions}', '0'::jsonb)
WHERE (limits->>'max_promotions') = '-1';

UPDATE public.membership_plans SET updated_at = now();