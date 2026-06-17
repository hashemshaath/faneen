import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

const ADMIN_SVC = read('src/modules/quotes/services/getAdminQuoteRequestById.ts');
const DETAIL_SVC = read('src/modules/leads/services/detail.ts');
const ADMIN_LIST = read('src/pages/admin/AdminQuoteRequests.tsx');
const DASH_LIST = read('src/pages/dashboard/DashboardMyRequests.tsx');
const ADMIN_DETAILS = read('src/pages/admin/AdminQuoteRequestDetails.tsx');
const EDGE = read('supabase/functions/submit-quote-request/index.ts');

const UUID_RE_SRC = /\^\[0-9a-f\]\{8\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{12\}\$/i;

describe('RFQ ref_id route resolution — final guard', () => {
  it('admin getter accepts both UUID and ref_id (column switch)', () => {
    expect(ADMIN_SVC).toMatch(/idOrRef\s*:\s*string/);
    expect(ADMIN_SVC).toMatch(UUID_RE_SRC);
    expect(ADMIN_SVC).toMatch(/UUID_RE\.test\(idOrRef\)\s*\?\s*'id'\s*:\s*'ref_id'/);
  });

  it('dashboard my-request detail accepts both UUID and ref_id, still scoped by user_id (RLS unchanged)', () => {
    expect(DETAIL_SVC).toMatch(/getMyQuoteRequestDetail[\s\S]{0,200}idOrRef\s*:\s*string/);
    expect(DETAIL_SVC).toMatch(/UUID_RE\.test\(idOrRef\)\s*\?\s*'id'\s*:\s*'ref_id'/);
    expect(DETAIL_SVC).toMatch(/\.eq\('user_id',\s*userId\)/);
  });

  it('admin list links prefer ref_id with UUID fallback', () => {
    expect(ADMIN_LIST).toMatch(/\/admin\/quote-requests\/\$\{r\.ref_id\s*\?\?\s*r\.id\}/);
  });

  it('dashboard list links prefer ref_id with UUID fallback', () => {
    expect(DASH_LIST).toMatch(/\/dashboard\/my-requests\/\$\{q\.ref_id\s*\?\?\s*q\.id\}/);
  });

  it('admin details page resolves once then uses quote.id for downstream queries (files/leads/events)', () => {
    expect(ADMIN_DETAILS).toMatch(/quoteUuid/);
    expect(ADMIN_DETAILS).toMatch(/quoteUuid\s*=\s*quote\?\.id\s*\?\?\s*null/);
  });

  it('admin notification action_url uses ref_id with UUID fallback', () => {
    expect(EDGE).toMatch(/action_url:\s*`\/admin\/quote-requests\/\$\{refId\s*\?\?\s*inserted\.id\}`/);
  });

  it('customer notification action_url uses ref_id with UUID fallback (no UUID leak when ref_id exists)', () => {
    expect(EDGE).toMatch(/action_url:\s*`\/dashboard\/my-requests\/\$\{refId\s*\?\?\s*inserted\.id\}`/);
  });

  it('no migrations / RLS / SQL changes shipped with this guard (edge has no SQL DDL)', () => {
    expect(EDGE).not.toMatch(/CREATE\s+POLICY|ALTER\s+TABLE|CREATE\s+TABLE|DROP\s+POLICY/i);
  });

  it('ref_id is never used to bypass auth — dashboard query still filters by user_id', () => {
    // Asserts the .eq('user_id', userId) sits in the same getter that accepts ref_id.
    const fnStart = DETAIL_SVC.indexOf('getMyQuoteRequestDetail');
    const fnSlice = DETAIL_SVC.slice(fnStart, fnStart + 800);
    expect(fnSlice).toMatch(/\.eq\('user_id',\s*userId\)/);
    expect(fnSlice).toMatch(/UUID_RE\.test\(idOrRef\)/);
  });

  it('no any / ts-ignore / eslint-disable smell in the touched service files', () => {
    for (const src of [ADMIN_SVC, DETAIL_SVC]) {
      expect(src).not.toMatch(/\bas any\b/);
      expect(src).not.toMatch(/@ts-ignore/);
      expect(src).not.toMatch(/@ts-expect-error/);
      expect(src).not.toMatch(/eslint-disable/);
    }
  });
});