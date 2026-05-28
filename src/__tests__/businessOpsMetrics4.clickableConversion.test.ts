import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * BUSINESS-OPS-METRICS-4 — Clickable conversion breakdown deep-links.
 *
 * Verifies conversion cards link to /dashboard/operations/feed with
 * correct source+action query params, and that the feed page reads and
 * initialises filters from the URL safely.
 */

const ROOT = path.resolve(__dirname, '..');
function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

const COMPONENT = 'components/workOrders/ProviderConversionBreakdown.tsx';
const PAGE = 'pages/dashboard/DashboardOperationsFeed.tsx';
const APP = 'App.tsx';

describe('BUSINESS-OPS-METRICS-4 — ProviderConversionBreakdown links', () => {
  const src = read(COMPONENT);

  it('imports Link from react-router-dom', () => {
    expect(src).toContain("from 'react-router-dom'");
    expect(src).toContain('Link');
  });

  it('links lead card to ?source=lead&action=converted', () => {
    expect(src).toContain("to: '/dashboard/operations/feed?source=lead&action=converted'");
  });

  it('links quote card to ?source=quote&action=converted', () => {
    expect(src).toContain("to: '/dashboard/operations/feed?source=quote&action=converted'");
  });

  it('links contract card to ?source=contract&action=converted', () => {
    expect(src).toContain("to: '/dashboard/operations/feed?source=contract&action=converted'");
  });

  it('links booking card to ?source=booking&action=converted', () => {
    expect(src).toContain("to: '/dashboard/operations/feed?source=booking&action=converted'");
  });

  it('wraps each card in a Link with aria-label', () => {
    expect(src).toContain('ariaLabel={chipAriaLabel');
    expect(src).toContain('aria-label={ariaLabel}');
  });

  it('has focus-visible ring for accessibility', () => {
    expect(src).toContain('focus-visible:ring-2');
    expect(src).toContain('focus-visible:ring-ring');
  });

  it('keeps hover-lift visual on cards', () => {
    expect(src).toContain('hover-lift');
  });

  it('does not use dead href="#"', () => {
    expect(src).not.toMatch(/href=["']#["']/);
  });

  it('does not import supabase/fetch/notifications/cron/realtime', () => {
    expect(src).not.toMatch(/from ['"]@\/integrations\/supabase/);
    expect(src).not.toMatch(/\bfetch\(/);
    expect(src).not.toMatch(/notifications?/i);
    expect(src).not.toMatch(/realtime/i);
    expect(src).not.toMatch(/\bcron\b/i);
  });

  it('does not render UUIDs, provider_intent_id, tokens, or synthetic emails', () => {
    const uuid = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;
    expect(src).not.toMatch(uuid);
    expect(src).not.toContain('provider_intent_id');
    expect(src).not.toMatch(/phone-[^@]+@/);
    expect(src).not.toMatch(/token/i);
  });
});

describe('BUSINESS-OPS-METRICS-4 — DashboardOperationsFeed query params', () => {
  const src = read(PAGE);

  it('imports useSearchParams from react-router-dom', () => {
    expect(src).toContain("import { Link, useSearchParams } from 'react-router-dom';");
  });

  it('defines VALID_SOURCES set with all allowed values', () => {
    expect(src).toContain("new Set<SourceFilter>(['all', 'work_order', 'contract', 'quote', 'lead', 'booking'])");
  });

  it('defines VALID_ACTIONS set with all allowed values', () => {
    expect(src).toContain("new Set<ActionFilter>(['all', 'created', 'updated', 'status_changed', 'converted'])");
  });

  it('reads source param from URL and validates against VALID_SOURCES', () => {
    expect(src).toContain("searchParams.get('source')");
    expect(src).toContain('VALID_SOURCES.has(src)');
  });

  it('reads action param from URL and validates against VALID_ACTIONS', () => {
    expect(src).toContain("searchParams.get('action')");
    expect(src).toContain('VALID_ACTIONS.has(act)');
  });

  it('reads ref param from URL into search query', () => {
    expect(src).toContain("searchParams.get('ref')");
  });

  it('initialises filters in a useEffect dependent on searchParams', () => {
    expect(src).toContain('useEffect(() => {');
    expect(src).toContain("searchParams.get('source')");
    expect(src).toContain("searchParams.get('action')");
    expect(src).toContain('}, [searchParams]);');
  });

  it('falls back safely when query params are invalid', () => {
    // The guard is: only set if VALID_* set has the value
    expect(src).toContain('if (src && VALID_SOURCES.has(src)) setSource(src);');
    expect(src).toContain('if (act && VALID_ACTIONS.has(act)) setAction(act);');
  });
});

describe('BUSINESS-OPS-METRICS-4 — route existence', () => {
  const app = read(APP);

  it('/dashboard/operations/feed route is registered', () => {
    expect(app).toContain('/dashboard/operations/feed');
    expect(app).toContain('DashboardOperationsFeed');
  });
});

describe('BUSINESS-OPS-METRICS-4 — page hygiene', () => {
  const page = read(PAGE);
  const comp = read(COMPONENT);

  it('no page or component uses direct supabase.from(', () => {
    expect(page).not.toMatch(/supabase\.from\(/);
    expect(comp).not.toMatch(/supabase\.from\(/);
  });

  it('no page or component renders raw UUIDs', () => {
    const uuid = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;
    expect(page).not.toMatch(uuid);
    expect(comp).not.toMatch(uuid);
  });

  it('no page or component uses href="#"', () => {
    expect(page).not.toMatch(/href=["']#["']/);
    expect(comp).not.toMatch(/href=["']#["']/);
  });
});
