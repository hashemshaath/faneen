# DB-GOVERNANCE-2 — Public Service & Branch Read Tightening

_Closes the P0/P1 items deferred from DB-GOVERNANCE-1 before SEO begins._

## P0 — `business_services` RLS

### Before

| Policy | Cmd | Roles | Qual |
|---|---|---|---|
| Services are viewable by everyone | SELECT | public | **`USING (true)`** |
| Admins can view all services | SELECT | authenticated | `has_role(auth.uid(),'admin')` |
| Business owners can manage services | INSERT | public | owner check |
| Business owners can update services | UPDATE | public | owner check |
| Business owners can delete services | DELETE | public | owner check |
| Admins can update service governance fields | UPDATE | authenticated | admin |

Plus `anon` had table-level `INSERT/UPDATE/DELETE` grants (no policy allowed them, but defense-in-depth was weak).

### After

| Policy | Cmd | Roles | Qual |
|---|---|---|---|
| Public can view active allowed services | SELECT | anon, authenticated | `is_active AND provider_status='active' AND admin_status='allowed'` |
| Owners can view their services | SELECT | authenticated | owner of parent business |
| Staff can view business services | SELECT | authenticated | `is_business_staff(auth.uid(), business_id)` |
| Admins can view all services | SELECT | authenticated | admin |
| (writes unchanged) | INSERT/UPDATE/DELETE | … | owner / admin |

`REVOKE INSERT, UPDATE, DELETE ON public.business_services FROM anon`.

Partial index added to keep the public filter cheap:

```sql
CREATE INDEX business_services_public_visibility_idx
ON public.business_services (business_id)
WHERE is_active AND provider_status='active' AND admin_status='allowed';
```

### Public visibility guarantee

- Anonymous and non-owner authenticated readers see **only** rows that pass the triple-gate.
- `admin_note`, `provider_note`, `rejection_reason`, `reviewed_by`, paused / hidden / rejected / pending_review rows are unreachable for the public.
- Owners keep full visibility (any status) for `/dashboard/services`.
- Admins keep full visibility for `/admin/service-activations`.
- Staff keep visibility for the businesses they staff.
- Linter delta: no new errors, no new warnings introduced.

## P1 — `business_branches_public`

View rebuilt to also require parent business approval:

```sql
WHERE b.is_active = true
  AND EXISTS (
    SELECT 1 FROM public.businesses parent
    WHERE parent.id = b.business_id
      AND parent.is_active = true
      AND parent.approval_status = 'published'
      AND parent.is_demo = false
  );
```

View marked `security_invoker = on` to match `businesses_public` / `reviews_public`.

`listBranchesByBusiness` gained an opt-in `source: 'private' | 'public'` flag. The public branch (`source='public'`) reads `business_branches_public` and skips the redundant `is_active` filter; the default `'private'` source is unchanged.

### BusinessProfile branches tab

Intentionally **kept on the private table** in this phase. The tab renders `contact_person`, `phone`, `mobile`, `email`, `unified_number`, `customer_service_phone`, `building_number`, and joined `cities` / `countries` — fields that the public view deliberately omits as PII. Anonymous visitors currently see an empty list (table RLS denies SELECT for `anon`), which is the existing safe behavior. Authenticated owners / staff / admins keep full visibility.

A future phase may split BusinessProfile branches into a public-safe summary + an authenticated detail view; that is out of scope for governance-only work.

## Owner / admin behavior

- `/dashboard/services` — unaffected. Owners read their own services via the new owner SELECT policy.
- `/admin/service-activations` — unaffected. Admin SELECT policy untouched; `providerServices/admin.ts` writes use the same governance fields as before.
- Provider mutations still cannot touch `admin_status` / `required_plan_tier` / `admin_note` — admin update policy gates those.

## Validation

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ clean |
| `bunx vitest run` (businesses + catalog + providerServices + search + business-profile) | ✅ 413/413 |
| `businesses-reads-isolation-audit` | ✅ 0 violations |
| `catalog-isolation-audit` | ✅ 0 violations |
| Supabase linter delta vs DB-GOVERNANCE-1 | ✅ no new errors |

## Outcome

**PASS.** P0 closed at the database layer; P1 view strengthened; wrapper capability landed for future public-only branch surfaces. SEO is unblocked from a data-governance perspective.

## Recommended next phase

Resume **SEO-1** (sitemap + JSON-LD + indexing rules) on top of the now-hardened public read surface.