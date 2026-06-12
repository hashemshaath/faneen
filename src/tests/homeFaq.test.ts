import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Mock supabase client BEFORE importing the service.
vi.mock('@/integrations/supabase/client', () => {
  type Row = { id: string; sort_order: number; question_ar: string; answer_ar: string; is_enabled: boolean };
  const rows: Row[] = [
    { id: 'a', sort_order: 10, question_ar: 'q1', answer_ar: 'a1', is_enabled: true },
    { id: 'b', sort_order: 20, question_ar: 'q2', answer_ar: 'a2', is_enabled: false },
  ];
  const builder = (filter: Partial<Row> = {}) => {
    const chain: Record<string, unknown> = {
      _filter: filter,
      select: () => chain,
      eq: (col: keyof Row, val: unknown) => { (chain as any)._filter[col] = val; return chain; },
      order: () => chain,
      then: (resolve: (v: { data: Row[]; error: null }) => void) => {
        const filtered = rows.filter((r) =>
          Object.entries((chain as any)._filter).every(([k, v]) => (r as any)[k] === v),
        );
        resolve({ data: filtered, error: null });
      },
    };
    return chain;
  };
  return { supabase: { from: () => builder() } };
});

describe('home FAQ — public service filters to enabled', () => {
  beforeEach(() => vi.clearAllMocks());

  it('only returns is_enabled=true rows', async () => {
    const { fetchPublicHomeFaq } = await import('@/modules/home/services/homeFaq');
    const items = await fetchPublicHomeFaq();
    expect(items.length).toBe(1);
    expect(items[0].id).toBe('a');
    expect(items[0].is_enabled).toBe(true);
  });
});

describe('home FAQ — fallback derived from faqItems.ts', () => {
  it('fallback array is non-empty and matches faqItems source length', async () => {
    const { HOME_FAQ_FALLBACK } = await import('@/modules/home/hooks/useHomeFaq');
    const { FAQ_ITEMS_BI } = await import('@/components/home/v2/sections/faqItems');
    expect(HOME_FAQ_FALLBACK.length).toBe(FAQ_ITEMS_BI.length);
    expect(HOME_FAQ_FALLBACK.every((x) => x.is_enabled)).toBe(true);
  });
});

describe('home FAQ — JSON-LD source alignment', () => {
  it('Index.tsx FAQ JSON-LD reads from useHomeFaq (DB-first), not FAQ_ITEMS_BI', () => {
    const src = readFileSync(resolve(__dirname, '..', 'pages/Index.tsx'), 'utf8');
    expect(src).toMatch(/useHomeFaq/);
    expect(src).toMatch(/faqItems\.map/);
    // Old static FAQ_ITEMS_BI usage must be removed from JSON-LD section.
    expect(src).not.toMatch(/FAQ_ITEMS_BI\.map/);
  });

  it('Index emits exactly one <h1>-equivalent (HeroV2 is the page H1)', () => {
    const src = readFileSync(resolve(__dirname, '..', 'pages/Index.tsx'), 'utf8');
    // Index.tsx itself should not declare any h1
    expect(src).not.toMatch(/<h1[\s>]/);
  });
});

describe('home FAQ — admin route + sidebar registration', () => {
  it('AdminHomeFaq route exists in App.tsx', () => {
    const app = readFileSync(resolve(__dirname, '..', 'App.tsx'), 'utf8');
    expect(app).toMatch(/path="\/admin\/home-faq"/);
    expect(app).toMatch(/AdminHomeFaq/);
  });
  it('Sidebar links to /admin/home-faq', () => {
    const sb = readFileSync(resolve(__dirname, '..', 'components/dashboard/DashboardSidebar.tsx'), 'utf8')
      + '\n' + readFileSync(resolve(__dirname, '..', 'modules/admin-shell/navigation/adminNavigation.ts'), 'utf8');
    expect(sb).toMatch(/\/admin\/home-faq/);
  });
});