/**
 * LEGACY CLEANUP L08 — guards the redirect of the legacy
 * `/admin/quote-requests*` admin surface to the canonical
 * `/admin/opportunities/*` surface.
 *
 * Scope: route table only. No DB / RLS / RPC / migrations / edge
 * functions / business logic / notification payloads were touched.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const APP = readFileSync(resolve(__dirname, '../App.tsx'), 'utf8');

describe('LEGACY CLEANUP L08 — /admin/quote-requests* redirect', () => {
  it('legacy list route stays registered (not deleted)', () => {
    expect(APP).toMatch(/path="\/admin\/quote-requests"/);
  });

  it('legacy detail route stays registered (not deleted)', () => {
    expect(APP).toMatch(/path="\/admin\/quote-requests\/:id"/);
  });

  it('legacy list route redirects to canonical /admin/opportunities/list', () => {
    expect(APP).toMatch(
      /path="\/admin\/quote-requests"\s+element=\{<ProtectedRoute\s+requireAdmin><Navigate\s+to="\/admin\/opportunities\/list"\s+replace\s*\/><\/ProtectedRoute>\}/,
    );
  });

  it('legacy detail route uses the LegacyAdminQuoteRequestDetailRedirect wrapper', () => {
    expect(APP).toMatch(
      /path="\/admin\/quote-requests\/:id"\s+element=\{<ProtectedRoute\s+requireAdmin><LegacyAdminQuoteRequestDetailRedirect\s*\/><\/ProtectedRoute>\}/,
    );
    expect(APP).toMatch(
      /Navigate to=\{`\/admin\/opportunities\/\$\{id \?\? ''\}`\} replace/,
    );
  });

  it('canonical admin opportunities routes still mount the original components', () => {
    expect(APP).toMatch(
      /path="\/admin\/opportunities\/list"\s+element=\{<ProtectedRoute requireAdmin><AdminQuoteRequests \/><\/ProtectedRoute>\}/,
    );
    expect(APP).toMatch(
      /path="\/admin\/opportunities\/:id"\s+element=\{<ProtectedRoute requireAdmin><AdminQuoteRequestDetails \/><\/ProtectedRoute>\}/,
    );
  });

  it('components AdminQuoteRequests and AdminQuoteRequestDetails are still imported (not removed)', () => {
    expect(APP).toMatch(/AdminQuoteRequests\b/);
    expect(APP).toMatch(/AdminQuoteRequestDetails\b/);
  });
});