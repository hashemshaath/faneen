/**
 * CUSTOMER-EXPERIENCE-1 — Customer tracking portal: security, snapshot,
 * UI, and notification-link integration guards.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const ROOT = path.resolve(__dirname, '..', '..');
const MIGRATION_DIR = path.join(ROOT, 'supabase/migrations');
const PORTAL_PAGE = path.join(ROOT, 'src/pages/CustomerProjectPortal.tsx');
const TRACKING_CARD = path.join(
  ROOT,
  'src/components/workOrders/CustomerTrackingCard.tsx',
);
const SAFETY_FILE = path.join(
  ROOT,
  'src/modules/operations/customerCommunications/safety.ts',
);
const APP_FILE = path.join(ROOT, 'src/App.tsx');
const MODULE_INDEX = path.join(ROOT, 'src/modules/customerTracking/index.ts');

function readAll(): string {
  return fs
    .readdirSync(MIGRATION_DIR)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => fs.readFileSync(path.join(MIGRATION_DIR, f), 'utf8'))
    .join('\n');
}

describe('A. Migration & RPC contract', () => {
  const all = readAll();
  it('creates customer_tracking_links table', () => {
    expect(all).toMatch(
      /CREATE TABLE IF NOT EXISTS public\.customer_tracking_links/,
    );
  });
  it('uses CTL- ref prefix', () => {
    expect(all).toMatch(/'CTL-' \|\| lpad/);
  });
  it('stores only token_hash (never raw token column)', () => {
    const block = all.match(
      /CREATE TABLE IF NOT EXISTS public\.customer_tracking_links[\s\S]+?\);/,
    );
    expect(block, 'table block').toBeTruthy();
    expect(block![0]).toMatch(/token_hash/);
    expect(block![0]).not.toMatch(/token\s+text\s+NOT NULL[^_]/);
  });
  it('enables RLS and has no anon GRANT on the table', () => {
    expect(all).toMatch(
      /ALTER TABLE public\.customer_tracking_links ENABLE ROW LEVEL SECURITY/,
    );
    expect(all).not.toMatch(
      /GRANT[^;]+ON public\.customer_tracking_links[^;]+TO anon/,
    );
  });
  it('snapshot RPC is SECURITY DEFINER and hash-checks token', () => {
    const fn = all.match(
      /CREATE OR REPLACE FUNCTION public\.get_customer_project_snapshot[\s\S]+?\$\$;/,
    );
    expect(fn, 'snapshot fn').toBeTruthy();
    expect(fn![0]).toMatch(/SECURITY DEFINER/);
    expect(fn![0]).toMatch(/encode\(extensions\.digest\(_token, 'sha256'\)/);
    expect(fn![0]).toMatch(/length\(_token\) < 32/);
  });
  it('snapshot denies revoked & expired links', () => {
    const fn = all.match(
      /CREATE OR REPLACE FUNCTION public\.get_customer_project_snapshot[\s\S]+?\$\$;/,
    )![0];
    expect(fn).toMatch(/revoked_at IS NOT NULL/);
    expect(fn).toMatch(/expires_at IS NOT NULL AND v_link\.expires_at < now\(\)/);
  });
  it('snapshot exposes only customer-safe fields', () => {
    const fn = all.match(
      /CREATE OR REPLACE FUNCTION public\.get_customer_project_snapshot[\s\S]+?\$\$;/,
    )![0];
    const returnBlock = fn.match(/RETURN jsonb_build_object\(([\s\S]+?)\);/)![1];
    // Must not leak internal/supplier/staff/audit fields:
    for (const forbidden of [
      'internal_note',
      'supplier_quote',
      'supplier_price',
      'staff_',
      'owner_user_id',
      'audit_',
      'token',
    ]) {
      expect(returnBlock).not.toMatch(new RegExp(forbidden));
    }
  });
  it('create RPC requires auth and authorizes by business owner/staff', () => {
    const fn = all.match(
      /CREATE OR REPLACE FUNCTION public\.create_customer_tracking_link[\s\S]+?\$\$;/,
    )![0];
    expect(fn).toMatch(/auth\.uid\(\)/);
    expect(fn).toMatch(/is_business_staff/);
    expect(fn).toMatch(/gen_random_bytes\(32\)/);
  });
  it('GRANT EXECUTE: anon can call snapshot, only authenticated can create/revoke', () => {
    expect(all).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.get_customer_project_snapshot\(text, text\) TO anon, authenticated/,
    );
    expect(all).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.create_customer_tracking_link\(uuid, text, timestamptz\) TO authenticated/,
    );
    expect(all).not.toMatch(
      /GRANT EXECUTE ON FUNCTION public\.create_customer_tracking_link[^;]+anon/,
    );
  });
});

describe('B. Portal page security', () => {
  const src = fs.readFileSync(PORTAL_PAGE, 'utf8');
  it('route is registered at /client/:refId', () => {
    const app = fs.readFileSync(APP_FILE, 'utf8');
    expect(app).toMatch(/path="\/client\/:refId"/);
    expect(app).toMatch(/CustomerProjectPortal/);
  });
  it('applies noindex', () => {
    expect(src).toMatch(/useNoIndex\(\)/);
  });
  it('does not touch supabase.from directly', () => {
    expect(src).not.toMatch(/supabase\.from\(/);
    expect(src).not.toMatch(/from\(['"]customer_tracking_links/);
  });
  it('does not import procurement / supplier / payment / chat / realtime surfaces', () => {
    for (const forbidden of [
      '/procurement',
      '/supplier',
      '/payments',
      '/messaging',
      'postgres_changes',
      'supabase.channel',
    ]) {
      expect(src).not.toMatch(new RegExp(forbidden.replace(/[/.]/g, '\\$&')));
    }
  });
  it('never renders BOQ / supplier / internal note labels', () => {
    for (const forbidden of [
      'internal_note',
      'supplier_quote',
      'supplier_price',
      'BOQ cost',
      'staff_assignment',
    ]) {
      expect(src).not.toMatch(new RegExp(forbidden));
    }
  });
  it('renders the milestone labels and timeline', () => {
    expect(src).toMatch(/customer-portal-timeline/);
    expect(src).toMatch(/Project Tracking/);
    expect(src).toMatch(/متابعة المشروع/);
  });
  it('does not render raw token from URL', () => {
    // Only used to call the RPC, never rendered into the DOM.
    expect(src).not.toMatch(/\{token\}/);
  });
});

describe('C. Provider tracking card', () => {
  const src = fs.readFileSync(TRACKING_CARD, 'utf8');
  it('uses the typed module wrappers, not raw supabase', () => {
    expect(src).toMatch(/createCustomerTrackingLink/);
    expect(src).toMatch(/revokeCustomerTrackingLink/);
    expect(src).not.toMatch(/supabase\.from\(/);
    expect(src).not.toMatch(/supabase\.rpc\(/);
  });
  it('only renders when canManage is true', () => {
    expect(src).toMatch(/if \(!canManage\) return null;/);
  });
  it('does not log the raw token', () => {
    expect(src).not.toMatch(/console\.(log|info|debug)\([^)]*token/i);
  });
});

describe('D. Notification action_url integration', () => {
  const src = fs.readFileSync(SAFETY_FILE, 'utf8');
  it('extends SAFE_ACTION_URL_PREFIXES with portal paths', () => {
    expect(src).toMatch(/'\/client\/'/);
    expect(src).toMatch(/'https:\/\/qitaat\.com\/client\/'/);
  });

  it('isSafeCustomerActionUrl accepts portal links by ref only', async () => {
    const { isSafeCustomerActionUrl } = await import(
      '@/modules/operations/customerCommunications/safety'
    );
    expect(isSafeCustomerActionUrl('/client/CTL-1000001?t=abcd')).toBe(true);
    expect(
      isSafeCustomerActionUrl('https://qitaat.com/client/CTL-1000001?t=abc'),
    ).toBe(true);
    // Reject raw UUIDs anywhere in URL:
    expect(
      isSafeCustomerActionUrl(
        '/client/11111111-2222-3333-4444-555555555555?t=xyz',
      ),
    ).toBe(false);
    expect(isSafeCustomerActionUrl('/admin/anything')).toBe(false);
  });
});

describe('E. Public module surface', () => {
  const idx = fs.readFileSync(MODULE_INDEX, 'utf8');
  it('exports buildCustomerPortalUrl with encoded params', () => {
    expect(idx).toMatch(/buildCustomerPortalUrl/);
    expect(idx).toMatch(/encodeURIComponent\(refId\)/);
    expect(idx).toMatch(/encodeURIComponent\(token\)/);
  });
  it('does not re-export create/revoke without explicit names', () => {
    expect(idx).toMatch(/createCustomerTrackingLink/);
    expect(idx).toMatch(/revokeCustomerTrackingLink/);
  });
});

describe('F. Snapshot wrapper safety', () => {
  beforeEach(() => vi.resetModules());

  it('returns missing_required when refId or token is empty', async () => {
    vi.doMock('@/integrations/supabase/client', () => ({
      supabase: { rpc: vi.fn() },
    }));
    const { getCustomerProjectSnapshot } = await import(
      '@/modules/customerTracking/services/getCustomerProjectSnapshot'
    );
    const a = await getCustomerProjectSnapshot({ refId: '', token: 'x' });
    expect(a.error).toBeInstanceOf(Error);
    const b = await getCustomerProjectSnapshot({ refId: 'CTL-1', token: '' });
    expect(b.error).toBeInstanceOf(Error);
  });

  it('forwards refId/token to the SECURITY DEFINER RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { tracking_ref: 'CTL-1' }, error: null });
    vi.doMock('@/integrations/supabase/client', () => ({ supabase: { rpc } }));
    const { getCustomerProjectSnapshot } = await import(
      '@/modules/customerTracking/services/getCustomerProjectSnapshot'
    );
    const res = await getCustomerProjectSnapshot({ refId: 'CTL-1', token: 'a'.repeat(64) });
    expect(rpc).toHaveBeenCalledWith('get_customer_project_snapshot', {
      _ref_id: 'CTL-1',
      _token: 'a'.repeat(64),
    });
    expect(res.data?.tracking_ref).toBe('CTL-1');
  });
});