import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(p), 'utf-8');

describe('SEO-9 — Projects ItemList + Showcase source hardening review', () => {
  it('/projects emits an ItemList sourced from published projects only', () => {
    const src = read('src/pages/Projects.tsx');
    expect(src).toMatch(/'@type':\s*'ItemList'/);
    // Source filters server-side on status='published'.
    expect(src).toMatch(/\.eq\(['"]status['"],\s*['"]published['"]\)/);
    // ListItems use canonical /projects/:id URLs.
    expect(src).toMatch(/\/projects\/\$\{p\.id\}/);
    // Built via shared structured-data helper / hook.
    expect(src).toMatch(/useMultiJsonLd/);
    expect(src).toMatch(/buildBreadcrumbList/);
  });

  it('/projects ItemList never enumerates admin/dashboard/auth/onboarding URLs', () => {
    const src = read('src/pages/Projects.tsx');
    expect(src).not.toMatch(/itemListElement[\s\S]{0,400}\/admin\b/);
    expect(src).not.toMatch(/itemListElement[\s\S]{0,400}\/dashboard\b/);
    expect(src).not.toMatch(/itemListElement[\s\S]{0,400}\/auth\b/);
    expect(src).not.toMatch(/itemListElement[\s\S]{0,400}\/onboarding\b/);
  });

  it('/projects ItemList carries no fake ratings/reviews', () => {
    const src = read('src/pages/Projects.tsx');
    expect(src).not.toMatch(/'@type':\s*'AggregateRating'/);
    expect(src).not.toMatch(/'@type':\s*'Review'/);
  });

  it('Showcase ItemList is intentionally deferred until source verification is enforced', () => {
    const src = read('src/pages/Showcase.tsx');
    // Blocker: current query filters status='approved' but does NOT filter
    // businesses by is_verified, while the hero advertises "verified only".
    // Adding ItemList over this source could enumerate unverified businesses,
    // so SEO-9 keeps Showcase ItemList deferred per safety policy.
    expect(src).not.toMatch(/'@type':\s*'ItemList'/);
    // Approved-only filter must remain in place on the source query.
    expect(src).toMatch(/\.eq\(['"]status['"],\s*['"]approved['"]\)/);
  });

  it('Showcase query selects only public-safe business fields', () => {
    const src = read('src/pages/Showcase.tsx');
    // No private/PII columns leaked through the join.
    expect(src).not.toMatch(/businesses!inner\([^)]*owner_id/);
    expect(src).not.toMatch(/businesses!inner\([^)]*owner_email/);
    expect(src).not.toMatch(/businesses!inner\([^)]*phone/);
    expect(src).not.toMatch(/businesses!inner\([^)]*email/);
  });
});