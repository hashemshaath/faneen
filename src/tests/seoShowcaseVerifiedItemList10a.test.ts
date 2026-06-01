import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve('src/pages/Showcase.tsx'), 'utf-8');

describe('SEO-10A — Showcase verified-only enforcement + ItemList', () => {
  it('enforces approved submissions on the source query', () => {
    expect(src).toMatch(/\.eq\(["']status["'],\s*["']approved["']\)/);
  });

  it('enforces verified + active + published + non-demo on the linked business', () => {
    expect(src).toMatch(/\.eq\(["']business\.is_verified["'],\s*true\)/);
    expect(src).toMatch(/\.eq\(["']business\.is_active["'],\s*true\)/);
    expect(src).toMatch(/\.eq\(["']business\.approval_status["'],\s*["']published["']\)/);
    expect(src).toMatch(/\.eq\(["']business\.is_demo["'],\s*false\)/);
  });

  it('selects only public-safe business fields (no PII)', () => {
    expect(src).not.toMatch(/businesses!inner\([^)]*\bemail\b/);
    expect(src).not.toMatch(/businesses!inner\([^)]*\bphone\b/);
    expect(src).not.toMatch(/businesses!inner\([^)]*\bmobile\b/);
    expect(src).not.toMatch(/businesses!inner\([^)]*national_id/);
    expect(src).not.toMatch(/businesses!inner\([^)]*vat_number/);
    expect(src).not.toMatch(/businesses!inner\([^)]*account_manager/);
  });

  it('emits an ItemList JSON-LD for the visible verified cards', () => {
    expect(src).toMatch(/"@type":\s*"ItemList"/);
    expect(src).toMatch(/\/showcase#showcase/);
    // Items link to public business profiles by username.
    expect(src).toMatch(/\$\{SITE_URL\}\/\$\{r\.business!\.username\}/);
    // Only rows with a real username are enumerated.
    expect(src).toMatch(/!!r\.business\?\.username/);
  });

  it('does not inject fake ratings/reviews or private routes', () => {
    expect(src).not.toMatch(/"@type":\s*"AggregateRating"/);
    expect(src).not.toMatch(/"@type":\s*"Review"/);
    expect(src).not.toMatch(/itemListElement[\s\S]{0,400}\/admin\b/);
    expect(src).not.toMatch(/itemListElement[\s\S]{0,400}\/dashboard\b/);
    expect(src).not.toMatch(/itemListElement[\s\S]{0,400}\/auth\b/);
  });
});