import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const PAGE = readFileSync(
  resolve(ROOT, 'src/pages/admin/AdminOpportunitiesOperations.tsx'),
  'utf8',
);
const APP = readFileSync(resolve(ROOT, 'src/App.tsx'), 'utf8');

describe('Opportunities Phase 8B — admin operations hardening', () => {
  it('1. /admin/opportunities is admin-only (ProtectedRoute requireAdmin)', () => {
    expect(APP).toMatch(
      /path="\/admin\/opportunities"\s+element=\{<ProtectedRoute\s+requireAdmin>\s*<AdminOpportunitiesOperations/,
    );
  });
  it('2. non-admin users cannot reach the page (no public/non-admin route alias)', () => {
    const aliases = APP.match(/path="[^"]*"[^>]*<AdminOpportunitiesOperations/g) ?? [];
    for (const line of aliases) {
      expect(line).toMatch(/requireAdmin/);
    }
    expect(aliases.length).toBeGreaterThan(0);
  });
  it('3. the only row CTA is "عرض التفاصيل"', () => {
    expect(PAGE).toContain('عرض التفاصيل');
    // The page must not wire any onClick handlers — only <Link> navigation is allowed.
    expect(PAGE).not.toMatch(/onClick=\{/);
    // And it must not import any mutation helper from the bids/contracts services.
    expect(PAGE).not.toMatch(/from\s+['"]@\/modules\/opportunities\/(bids|contracts)/);
  });
  it('4. no edit/award/convert/match buttons in the ops center', () => {
    expect(PAGE).not.toMatch(/awardOpportunityBid|convertAwardedBidToContract|submitOpportunityBid|rematch/i);
    expect(PAGE).not.toMatch(/\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
    expect(PAGE).not.toMatch(/supabase\.rpc\(/);
  });
  it('5. empty state copy is present', () => {
    expect(PAGE).toContain('لا توجد فرص لعرضها بعد');
  });
  it('6. error state copy is present', () => {
    expect(PAGE).toContain('تعذر تحميل بيانات لوحة العمليات');
  });
  it('7. loading skeletons are present', () => {
    expect(PAGE).toMatch(/Skeleton/);
    expect(PAGE).toMatch(/isLoading/);
  });
  it('8. legacy routes still work (/admin/opportunities/list and /:id)', () => {
    expect(APP).toMatch(/path="\/admin\/opportunities\/list"/);
    expect(APP).toMatch(/path="\/admin\/opportunities\/:id"/);
    expect(APP).toMatch(/path="\/admin\/quote-requests"/);
  });
  it('9. no any / suppressions / service_role in the page', () => {
    expect(PAGE).not.toMatch(/@ts-(ignore|expect-error|nocheck)/);
    expect(PAGE).not.toMatch(/:\s*any\b/);
    expect(PAGE).not.toMatch(/\bas\s+any\b/);
    expect(PAGE).not.toMatch(/service_role/i);
  });
  it('10. table is bounded by an explicit limit', () => {
    expect(PAGE).toMatch(/listOpportunityOpsRows\(\s*\d+\s*\)/);
  });
});
