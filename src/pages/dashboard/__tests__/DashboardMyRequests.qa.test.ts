import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SRC = readFileSync(
  resolve(__dirname, '../DashboardMyRequests.tsx'),
  'utf8'
);

describe('DashboardMyRequests UI refresh QA', () => {
  it('renders exactly 4 HeroKpi cards', () => {
    const matches = SRC.match(/<HeroKpi\b/g) ?? [];
    expect(matches.length).toBe(4);
  });

  it('does not include the legacy status-distribution UI block', () => {
    // Allow the analytics memo comment that builds segments,
    // but the rendered title/UI must be gone.
    expect(SRC).not.toMatch(/توزيع الحالات/);
    expect(SRC).not.toMatch(/Status distribution/);
  });

  it('does not include the legacy standalone AnalyticTile performance panel', () => {
    expect(SRC).not.toMatch(/<AnalyticTile\b/);
    expect(SRC).not.toMatch(/Performance analytics/);
  });

  it('CTA links to /dashboard/my-requests/:id', () => {
    expect(SRC).toMatch(/\/dashboard\/my-requests\/\$\{[^}]+\}/);
  });

  it('has no hardcoded hex colors', () => {
    const hexes = SRC.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) ?? [];
    expect(hexes).toEqual([]);
  });

  it('has no new `as any` / `: any` / ts-ignore suppressions', () => {
    expect(SRC).not.toMatch(/\bas\s+any\b/);
    expect(SRC).not.toMatch(/:\s*any\b/);
    expect(SRC).not.toMatch(/@ts-ignore/);
  });

  it('analytics is wrapped in useMemo with divide-by-zero guards', () => {
    expect(SRC).toMatch(/const analytics = useMemo\(/);
    // Guards on the three percentage/avg fields
    expect(SRC).toMatch(/l\.length === 0 \? 0/);
    expect(SRC).toMatch(/responded\.length === 0 \? 0/);
    expect(SRC).toMatch(/prev7 === 0 \?/);
  });
});

// Pure logic replica of the page's analytics memo — guards must not yield NaN/Infinity.
function computeAnalytics(
  leads: Array<{ created_at: string; updated_at?: string | null; status: string; viewed_at?: string | null }>,
  quotes: Array<{ created_at: string; updated_at?: string | null; status: string; sector?: string }>
) {
  const all = [...leads, ...quotes.map((x) => ({ ...x }))];
  const now = Date.now();
  const DAY = 86400000;
  const last7 = all.filter((x) => now - new Date(x.created_at).getTime() < 7 * DAY).length;
  const prev7 = all.filter((x) => {
    const t = now - new Date(x.created_at).getTime();
    return t >= 7 * DAY && t < 14 * DAY;
  }).length;
  const weekDelta = prev7 === 0 ? (last7 > 0 ? 100 : 0) : Math.round(((last7 - prev7) / prev7) * 100);
  const viewed = leads.filter((x) => !!x.viewed_at).length;
  const responseRate = leads.length === 0 ? 0 : Math.round((viewed / leads.length) * 100);
  const responded = leads.filter((x) => x.updated_at && x.status !== 'new');
  const avgRespHours =
    responded.length === 0
      ? 0
      : Math.round(
          responded.reduce(
            (s, x) => s + Math.max(0, new Date(x.updated_at!).getTime() - new Date(x.created_at).getTime()),
            0
          ) / responded.length / 3600000
        );
  const conversion =
    leads.length === 0
      ? 0
      : Math.round(
          (leads.filter((x) => x.status === 'quoted' || x.status === 'accepted').length / leads.length) * 100
        );
  return { last7, prev7, weekDelta, responseRate, avgRespHours, conversion };
}

describe('analytics safety', () => {
  it('empty inputs produce no NaN / Infinity', () => {
    const a = computeAnalytics([], []);
    Object.values(a).forEach((v) => {
      expect(Number.isFinite(v)).toBe(true);
      expect(Number.isNaN(v)).toBe(false);
    });
    expect(a.responseRate).toBe(0);
    expect(a.conversion).toBe(0);
    expect(a.weekDelta).toBe(0);
    expect(a.avgRespHours).toBe(0);
  });

  it('handles missing updated_at without throwing', () => {
    const a = computeAnalytics(
      [
        { created_at: new Date().toISOString(), updated_at: null, status: 'new', viewed_at: null },
      ],
      []
    );
    expect(Number.isFinite(a.avgRespHours)).toBe(true);
    expect(a.avgRespHours).toBe(0);
  });

  it('week delta uses 100% fallback when prev7=0 and last7>0', () => {
    const a = computeAnalytics(
      [{ created_at: new Date().toISOString(), updated_at: null, status: 'new', viewed_at: null }],
      []
    );
    expect(a.weekDelta).toBe(100);
  });
});
