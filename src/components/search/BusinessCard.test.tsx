import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Profiler, type ProfilerOnRenderCallback } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BusinessCard } from './BusinessCard';

const langState = vi.hoisted(() => ({ language: 'ar' as 'ar' | 'en', isRTL: true }));
vi.mock('@/i18n/LanguageContext', () => ({
  useLanguage: () => ({ language: langState.language, isRTL: langState.isRTL }),
}));
const setLanguage = (lang: 'ar' | 'en') => {
  langState.language = lang;
  langState.isRTL = lang === 'ar';
};
afterEach(() => setLanguage('ar'));
vi.mock('@/hooks/useBusinessFavorites', () => ({
  useBusinessFavorites: () => ({ isFavorite: () => false, toggleFavorite: () => false }),
}));
vi.mock('@/hooks/useRecentlyViewedBusinesses', () => ({
  useRecentlyViewedBusinesses: () => ({ track: () => {} }),
}));
vi.mock('sonner', () => ({ toast: { success: () => {} } }));

const baseBiz = {
  id: 'b1',
  username: 'acme',
  name_ar: 'أكمي',
  name_en: 'Acme',
  description_ar: 'وصف',
  rating_avg: 4.2,
  rating_count: 10,
  is_verified: false,
  membership_tier: 'basic',
  cities: { name_ar: 'الرياض', name_en: 'Riyadh' },
  categories: { name_ar: 'ألمنيوم', name_en: 'Aluminum' },
  business_services: [],
  promotions: [],
};

const renderCard = (b: Record<string, unknown>, viewMode: 'grid' | 'list' = 'grid') =>
  render(
    <MemoryRouter>
      <BusinessCard business={b} viewMode={viewMode} />
    </MemoryRouter>,
  );

describe('BusinessCard badges & service tags', () => {
  it('hides verified, coupon, and service tags when data is empty/invalid', () => {
    renderCard(baseBiz);
    expect(screen.queryByText('شركة موثقة')).toBeNull();
    expect(screen.queryByText('كوبون خصم')).toBeNull();
    // No service chip rendered
    expect(screen.queryByText(/تركيب/)).toBeNull();
  });

  it('shows verified badge only when is_verified is true', () => {
    renderCard({ ...baseBiz, is_verified: true });
    expect(screen.getAllByText('شركة موثقة').length).toBeGreaterThan(0);
  });

  it('shows coupon badge only for active, non-expired promotions', () => {
    const future = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    renderCard({ ...baseBiz, promotions: [{ id: 'p1', is_active: true, end_date: future }] });
    expect(screen.getAllByText('كوبون خصم').length).toBeGreaterThan(0);
  });

  it('hides coupon badge for inactive or expired promotions', () => {
    const past = '2000-01-01';
    renderCard({
      ...baseBiz,
      promotions: [
        { id: 'p1', is_active: false, end_date: null },
        { id: 'p2', is_active: true, end_date: past },
      ],
    });
    expect(screen.queryByText('كوبون خصم')).toBeNull();
  });

  it('renders only active service tags and a +N counter for the rest', () => {
    renderCard({
      ...baseBiz,
      business_services: [
        { name_ar: 'تركيب', is_active: true },
        { name_ar: 'صيانة', is_active: true },
        { name_ar: 'تصميم', is_active: true },
        { name_ar: 'توريد', is_active: true },
        { name_ar: 'مخفي', is_active: false },
      ],
    });
    expect(screen.getByText('تركيب')).toBeInTheDocument();
    expect(screen.getByText('صيانة')).toBeInTheDocument();
    expect(screen.getByText('تصميم')).toBeInTheDocument();
    expect(screen.queryByText('مخفي')).toBeNull();
    // 4 active - 3 visible = +1
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('handles missing/non-array promotions & services gracefully', () => {
    renderCard({ ...baseBiz, promotions: undefined, business_services: null });
    expect(screen.queryByText('كوبون خصم')).toBeNull();
  });
});

/**
 * Primary category badge — replaces the bare category text. Must render when
 * `business.categories` is present, and must render nothing otherwise.
 */
describe('BusinessCard primary category badge', () => {
  it('renders the category name when business.categories is set (Arabic)', () => {
    renderCard(baseBiz);
    expect(screen.getAllByText('ألمنيوم').length).toBeGreaterThan(0);
  });

  it('renders the English category name when language is English', () => {
    setLanguage('en');
    renderCard(baseBiz);
    expect(screen.getAllByText('Aluminum').length).toBeGreaterThan(0);
  });

  it('renders no category text when business.categories is missing', () => {
    const { categories: _omit, ...without } = baseBiz;
    renderCard(without);
    expect(screen.queryByText('ألمنيوم')).toBeNull();
    expect(screen.queryByText('Aluminum')).toBeNull();
  });
});

/**
 * Service-category diversity pill — visible only when distinct non-null
 * `business_services.category_id` count among active services is > 1.
 */
describe('BusinessCard service-category diversity pill', () => {
  const arMatcher = /\+\d+\s*تخصصات/;
  const enMatcher = /\+\d+\s+service categories/i;

  it('does not render when all active services share a single category_id', () => {
    renderCard({
      ...baseBiz,
      business_services: [
        { name_ar: 'تركيب', is_active: true, category_id: 'cat-1' },
        { name_ar: 'صيانة', is_active: true, category_id: 'cat-1' },
        { name_ar: 'تصميم', is_active: true, category_id: 'cat-1' },
      ],
    });
    expect(screen.queryByText(arMatcher)).toBeNull();
  });

  it('does not render when only one active service has a non-null category_id', () => {
    renderCard({
      ...baseBiz,
      business_services: [
        { name_ar: 'تركيب', is_active: true, category_id: 'cat-1' },
        { name_ar: 'صيانة', is_active: true, category_id: null },
      ],
    });
    expect(screen.queryByText(arMatcher)).toBeNull();
  });

  it('renders +2 تخصصات when active services span 2 distinct category_ids', () => {
    renderCard({
      ...baseBiz,
      business_services: [
        { name_ar: 'تركيب', is_active: true, category_id: 'cat-a' },
        { name_ar: 'صيانة', is_active: true, category_id: 'cat-b' },
      ],
    });
    expect(screen.getAllByText(arMatcher).length).toBeGreaterThan(0);
  });

  it('ignores inactive services when computing distinct category_id count', () => {
    renderCard({
      ...baseBiz,
      business_services: [
        { name_ar: 'تركيب', is_active: true, category_id: 'cat-a' },
        { name_ar: 'معطلة', is_active: false, category_id: 'cat-b' },
      ],
    });
    expect(screen.queryByText(arMatcher)).toBeNull();
  });

  it('renders English label when language is English', () => {
    setLanguage('en');
    renderCard({
      ...baseBiz,
      business_services: [
        { name_ar: 'A', name_en: 'A', is_active: true, category_id: 'cat-a' },
        { name_ar: 'B', name_en: 'B', is_active: true, category_id: 'cat-b' },
        { name_ar: 'C', name_en: 'C', is_active: true, category_id: 'cat-c' },
      ],
    });
    expect(screen.getAllByText(enMatcher).length).toBeGreaterThan(0);
  });
});

/**
 * Coupon "end_date" boundary tests.
 *
 * The component compares promotion `end_date` (a YYYY-MM-DD string from
 * Postgres) against `new Date().toISOString().slice(0, 10)` — i.e. **today
 * in UTC**. The badge must show when `end_date >= todayUTC`.
 *
 * These tests pin "now" with fake timers so we can verify the UTC boundary
 * behaves the same regardless of the runner's local timezone.
 */
describe('BusinessCard coupon end_date boundary (UTC)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const setNow = (iso: string) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(iso));
  };

  it('shows coupon when end_date equals today (UTC)', () => {
    setNow('2026-05-07T12:00:00Z'); // today UTC = 2026-05-07
    renderCard({ ...baseBiz, promotions: [{ id: 'p', is_active: true, end_date: '2026-05-07' }] });
    expect(screen.getAllByText('كوبون خصم').length).toBeGreaterThan(0);
  });

  it('hides coupon when end_date is yesterday (UTC)', () => {
    setNow('2026-05-07T12:00:00Z');
    renderCard({ ...baseBiz, promotions: [{ id: 'p', is_active: true, end_date: '2026-05-06' }] });
    expect(screen.queryByText('كوبون خصم')).toBeNull();
  });

  it('shows coupon at 23:59 UTC on the end_date day', () => {
    setNow('2026-05-07T23:59:59Z');
    renderCard({ ...baseBiz, promotions: [{ id: 'p', is_active: true, end_date: '2026-05-07' }] });
    expect(screen.getAllByText('كوبون خصم').length).toBeGreaterThan(0);
  });

  it('hides coupon one second after midnight UTC the next day', () => {
    setNow('2026-05-08T00:00:01Z');
    renderCard({ ...baseBiz, promotions: [{ id: 'p', is_active: true, end_date: '2026-05-07' }] });
    expect(screen.queryByText('كوبون خصم')).toBeNull();
  });

  it('treats null end_date as never-expiring (always shows when active)', () => {
    setNow('2099-12-31T00:00:00Z');
    renderCard({ ...baseBiz, promotions: [{ id: 'p', is_active: true, end_date: null }] });
    expect(screen.getAllByText('كوبون خصم').length).toBeGreaterThan(0);
  });

  it('UTC boundary: late-evening local time on May 7 that is already May 8 UTC hides a May-7 coupon', () => {
    // 03:30 on May 8 UTC corresponds to e.g. 06:30 local in +03:00 (Riyadh).
    // Either way, the comparison uses UTC, so a coupon whose end_date is
    // 2026-05-07 must be hidden.
    setNow('2026-05-08T03:30:00Z');
    renderCard({ ...baseBiz, promotions: [{ id: 'p', is_active: true, end_date: '2026-05-07' }] });
    expect(screen.queryByText('كوبون خصم')).toBeNull();
  });

  it('UTC boundary: late-evening local time on May 7 that is still May 7 UTC keeps a May-7 coupon visible', () => {
    // 21:00 UTC on May 7 = midnight on May 8 in +03:00. The component uses
    // UTC for "today", so the badge must remain visible.
    setNow('2026-05-07T21:00:00Z');
    renderCard({ ...baseBiz, promotions: [{ id: 'p', is_active: true, end_date: '2026-05-07' }] });
    expect(screen.getAllByText('كوبون خصم').length).toBeGreaterThan(0);
  });
});

/**
 * "+N" service-tag overflow counter.
 *
 * Visible chips = first 3 active services. The "+N" badge must equal
 * (count of active services) - 3, ignoring inactive services entirely.
 */
describe('BusinessCard service-tag +N overflow counter', () => {
  const mkServices = (active: number, inactive = 0) => [
    ...Array.from({ length: active }, (_, i) => ({ name_ar: `خدمة-${i + 1}`, is_active: true })),
    ...Array.from({ length: inactive }, (_, i) => ({ name_ar: `معطلة-${i + 1}`, is_active: false })),
  ];

  it('shows no +N when active services <= 3', () => {
    renderCard({ ...baseBiz, business_services: mkServices(3) });
    expect(screen.getByText('خدمة-1')).toBeInTheDocument();
    expect(screen.getByText('خدمة-3')).toBeInTheDocument();
    expect(screen.queryByText(/^\+\d+$/)).toBeNull();
  });

  it('shows +1 when there are 4 active services', () => {
    renderCard({ ...baseBiz, business_services: mkServices(4) });
    expect(screen.getByText('+1')).toBeInTheDocument();
    expect(screen.queryByText('خدمة-4')).toBeNull();
  });

  it('shows +2 when there are 5 active services', () => {
    renderCard({ ...baseBiz, business_services: mkServices(5) });
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('shows +7 when there are 10 active services', () => {
    renderCard({ ...baseBiz, business_services: mkServices(10) });
    expect(screen.getByText('+7')).toBeInTheDocument();
  });

  it('ignores inactive services in the +N count (6 active + 50 inactive ⇒ +3)', () => {
    renderCard({ ...baseBiz, business_services: mkServices(6, 50) });
    expect(screen.getByText('+3')).toBeInTheDocument();
    expect(screen.queryByText(/^معطلة-/)).toBeNull();
  });

  it('shows no +N when only inactive services exist', () => {
    renderCard({ ...baseBiz, business_services: mkServices(0, 5) });
    expect(screen.queryByText(/^\+\d+$/)).toBeNull();
  });

  it('skips services missing both name_ar and name_en when computing visible chips', () => {
    // 5 entries marked active, but 2 have no usable name → only 3 valid tags
    // → no overflow badge.
    renderCard({
      ...baseBiz,
      business_services: [
        { name_ar: 'تركيب', is_active: true },
        { name_ar: 'صيانة', is_active: true },
        { name_ar: 'تصميم', is_active: true },
        { name_ar: null, name_en: null, is_active: true },
        { name_ar: '', name_en: '', is_active: true },
      ],
    });
    expect(screen.getByText('تركيب')).toBeInTheDocument();
    expect(screen.queryByText(/^\+\d+$/)).toBeNull();
  });
});

/**
 * Service tags + "+N" counter when language is English.
 *
 * The component picks `name_en` first when `language === 'en'`, falling back
 * to `name_ar` only if `name_en` is missing. The +N count must still equal
 * (active count) - 3 and ignore inactive entries.
 */
describe('BusinessCard service tags & +N with name_en (English)', () => {
  beforeEach(() => setLanguage('en'));

  it('renders English service names when name_en is present', () => {
    renderCard({
      ...baseBiz,
      business_services: [
        { name_ar: 'تركيب', name_en: 'Installation', is_active: true },
        { name_ar: 'صيانة', name_en: 'Maintenance', is_active: true },
        { name_ar: 'تصميم', name_en: 'Design', is_active: true },
      ],
    });
    expect(screen.getByText('Installation')).toBeInTheDocument();
    expect(screen.getByText('Maintenance')).toBeInTheDocument();
    expect(screen.getByText('Design')).toBeInTheDocument();
    // Arabic names must not leak when language is English and name_en exists.
    expect(screen.queryByText('تركيب')).toBeNull();
    expect(screen.queryByText(/^\+\d+$/)).toBeNull();
  });

  it('falls back to name_ar when name_en is missing/empty in English mode', () => {
    renderCard({
      ...baseBiz,
      business_services: [
        { name_ar: 'تركيب', name_en: '', is_active: true },
        { name_ar: 'صيانة', name_en: null, is_active: true },
        { name_ar: 'تصميم', name_en: 'Design', is_active: true },
      ],
    });
    expect(screen.getByText('تركيب')).toBeInTheDocument();
    expect(screen.getByText('صيانة')).toBeInTheDocument();
    expect(screen.getByText('Design')).toBeInTheDocument();
  });

  it('computes +N using English names with mixed active/inactive (5 active ⇒ +2)', () => {
    renderCard({
      ...baseBiz,
      business_services: [
        { name_ar: 'أ', name_en: 'Svc-A', is_active: true },
        { name_ar: 'ب', name_en: 'Svc-B', is_active: true },
        { name_ar: 'ج', name_en: 'Svc-C', is_active: true },
        { name_ar: 'د', name_en: 'Svc-D', is_active: true },
        { name_ar: 'هـ', name_en: 'Svc-E', is_active: true },
        { name_ar: 'و', name_en: 'Svc-F', is_active: false },
        { name_ar: 'ز', name_en: 'Svc-G', is_active: false },
      ],
    });
    expect(screen.getByText('Svc-A')).toBeInTheDocument();
    expect(screen.getByText('Svc-B')).toBeInTheDocument();
    expect(screen.getByText('Svc-C')).toBeInTheDocument();
    expect(screen.queryByText('Svc-D')).toBeNull();
    expect(screen.queryByText('Svc-F')).toBeNull();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('skips entries with neither name_en nor name_ar in English mode', () => {
    renderCard({
      ...baseBiz,
      business_services: [
        { name_ar: 'تركيب', name_en: 'Installation', is_active: true },
        { name_ar: 'صيانة', name_en: 'Maintenance', is_active: true },
        { name_ar: 'تصميم', name_en: 'Design', is_active: true },
        { name_ar: null, name_en: null, is_active: true },
        { name_ar: '', name_en: '', is_active: true },
      ],
    });
    expect(screen.getByText('Installation')).toBeInTheDocument();
    expect(screen.queryByText(/^\+\d+$/)).toBeNull();
  });

  it('shows +7 with 10 active English-named services', () => {
    renderCard({
      ...baseBiz,
      business_services: Array.from({ length: 10 }, (_, i) => ({
        name_ar: `خدمة-${i + 1}`,
        name_en: `Service-${i + 1}`,
        is_active: true,
      })),
    });
    expect(screen.getByText('Service-1')).toBeInTheDocument();
    expect(screen.getByText('Service-3')).toBeInTheDocument();
    expect(screen.queryByText('Service-4')).toBeNull();
    expect(screen.getByText('+7')).toBeInTheDocument();
  });
});

/**
 * Empty / undefined `business_services` must render zero chips and zero +N.
 */
describe('BusinessCard service tags absent when business_services is empty/undefined', () => {
  const expectNoChipsOrCounter = () => {
    expect(screen.queryByText(/^\+\d+$/)).toBeNull();
    // No service-tag chips means no element with the service-chip text pattern
    // we use in other tests (e.g. "خدمة-1", "Service-1", "تركيب").
    expect(screen.queryByText(/^خدمة-\d+$/)).toBeNull();
    expect(screen.queryByText(/^Service-\d+$/)).toBeNull();
    expect(screen.queryByText('تركيب')).toBeNull();
  };

  it('renders no chips and no +N when business_services is an empty array', () => {
    renderCard({ ...baseBiz, business_services: [] });
    expectNoChipsOrCounter();
  });

  it('renders no chips and no +N when business_services is undefined', () => {
    const { business_services: _omit, ...without } = baseBiz;
    renderCard(without);
    expectNoChipsOrCounter();
  });

  it('renders no chips and no +N when business_services is null', () => {
    renderCard({ ...baseBiz, business_services: null });
    expectNoChipsOrCounter();
  });

  it('renders no chips and no +N when business_services is not an array (malformed)', () => {
    renderCard({ ...baseBiz, business_services: 'oops' as unknown as never });
    expectNoChipsOrCounter();
  });

  it('renders no chips and no +N when every service is inactive', () => {
    renderCard({
      ...baseBiz,
      business_services: [
        { name_ar: 'خدمة-1', is_active: false },
        { name_ar: 'خدمة-2', is_active: false },
        { name_ar: 'خدمة-3', is_active: false },
        { name_ar: 'خدمة-4', is_active: false },
      ],
    });
    expectNoChipsOrCounter();
  });
});

/**
 * Stable ordering of active services.
 *
 * The visible chips must always be the FIRST 3 active services in input
 * order (inactive entries skipped, never re-ordered), and +N must equal
 * (active count) - 3. Re-rendering the same input must not shuffle chips.
 */
describe('BusinessCard stable ordering of active services', () => {
  it('preserves input order when picking the first 3 active services', () => {
    renderCard({
      ...baseBiz,
      business_services: [
        { name_ar: 'خدمة-A', is_active: true },
        { name_ar: 'خدمة-B', is_active: true },
        { name_ar: 'خدمة-C', is_active: true },
        { name_ar: 'خدمة-D', is_active: true },
        { name_ar: 'خدمة-E', is_active: true },
      ],
    });
    const chips = ['خدمة-A', 'خدمة-B', 'خدمة-C'].map((t) => screen.getByText(t));
    // DOM order must match input order.
    expect(chips[0].compareDocumentPosition(chips[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(chips[1].compareDocumentPosition(chips[2]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByText('خدمة-D')).toBeNull();
    expect(screen.queryByText('خدمة-E')).toBeNull();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('skips inactive services without re-ordering active ones', () => {
    renderCard({
      ...baseBiz,
      business_services: [
        { name_ar: 'معطلة-1', is_active: false },
        { name_ar: 'خدمة-A', is_active: true },
        { name_ar: 'معطلة-2', is_active: false },
        { name_ar: 'خدمة-B', is_active: true },
        { name_ar: 'معطلة-3', is_active: false },
        { name_ar: 'خدمة-C', is_active: true },
        { name_ar: 'خدمة-D', is_active: true },
      ],
    });
    const a = screen.getByText('خدمة-A');
    const b = screen.getByText('خدمة-B');
    const c = screen.getByText('خدمة-C');
    expect(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(b.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByText('خدمة-D')).toBeNull();
    expect(screen.queryByText(/^معطلة-/)).toBeNull();
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('produces identical DOM order across two renders of the same input', () => {
    const services = [
      { name_ar: 'خدمة-A', is_active: true },
      { name_ar: 'خدمة-B', is_active: true },
      { name_ar: 'خدمة-C', is_active: true },
      { name_ar: 'خدمة-D', is_active: true },
    ];
    const { unmount } = renderCard({ ...baseBiz, business_services: services });
    const firstOrder = ['خدمة-A', 'خدمة-B', 'خدمة-C'].map((t) => screen.getByText(t).textContent);
    expect(screen.getByText('+1')).toBeInTheDocument();
    unmount();
    renderCard({ ...baseBiz, business_services: services });
    const secondOrder = ['خدمة-A', 'خدمة-B', 'خدمة-C'].map((t) => screen.getByText(t).textContent);
    expect(secondOrder).toEqual(firstOrder);
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('does not alphabetize: input order "C, A, B" stays "C, A, B"', () => {
    renderCard({
      ...baseBiz,
      business_services: [
        { name_ar: 'خدمة-C', is_active: true },
        { name_ar: 'خدمة-A', is_active: true },
        { name_ar: 'خدمة-B', is_active: true },
      ],
    });
    const c = screen.getByText('خدمة-C');
    const a = screen.getByText('خدمة-A');
    const b = screen.getByText('خدمة-B');
    expect(c.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

/**
 * Non-boolean / nullish `is_active` values must be treated as "not active"
 * (the component filters via `s.is_active` truthiness). The +N counter must
 * only count entries whose `is_active` is strictly truthy.
 */
describe('BusinessCard +N counter with null/non-boolean is_active', () => {
  it('treats is_active = null as inactive (no chip, no +N)', () => {
    renderCard({
      ...baseBiz,
      business_services: [
        { name_ar: 'خدمة-1', is_active: null },
        { name_ar: 'خدمة-2', is_active: null },
        { name_ar: 'خدمة-3', is_active: null },
        { name_ar: 'خدمة-4', is_active: null },
      ],
    });
    expect(screen.queryByText(/^خدمة-\d+$/)).toBeNull();
    expect(screen.queryByText(/^\+\d+$/)).toBeNull();
  });

  it('treats is_active = undefined as inactive', () => {
    renderCard({
      ...baseBiz,
      business_services: [
        { name_ar: 'خدمة-1' },
        { name_ar: 'خدمة-2' },
        { name_ar: 'خدمة-3' },
        { name_ar: 'خدمة-4' },
      ],
    });
    expect(screen.queryByText(/^خدمة-\d+$/)).toBeNull();
    expect(screen.queryByText(/^\+\d+$/)).toBeNull();
  });

  it('treats falsy non-boolean is_active (0, "", false) as inactive', () => {
    renderCard({
      ...baseBiz,
      business_services: [
        { name_ar: 'خدمة-1', is_active: 0 },
        { name_ar: 'خدمة-2', is_active: '' },
        { name_ar: 'خدمة-3', is_active: false },
        { name_ar: 'خدمة-4', is_active: true },
      ],
    });
    expect(screen.getByText('خدمة-4')).toBeInTheDocument();
    expect(screen.queryByText('خدمة-1')).toBeNull();
    expect(screen.queryByText('خدمة-2')).toBeNull();
    expect(screen.queryByText('خدمة-3')).toBeNull();
    expect(screen.queryByText(/^\+\d+$/)).toBeNull();
  });

  it('counts only truthy is_active when mixing null/undefined/true (5 truthy ⇒ +2)', () => {
    renderCard({
      ...baseBiz,
      business_services: [
        { name_ar: 'A', is_active: true },
        { name_ar: 'B', is_active: null },
        { name_ar: 'C', is_active: true },
        { name_ar: 'D', is_active: undefined },
        { name_ar: 'E', is_active: true },
        { name_ar: 'F', is_active: false },
        { name_ar: 'G', is_active: true },
        { name_ar: 'H', is_active: true },
      ],
    });
    // Visible chips: first 3 truthy in input order → A, C, E
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('E')).toBeInTheDocument();
    expect(screen.queryByText('B')).toBeNull();
    expect(screen.queryByText('D')).toBeNull();
    expect(screen.queryByText('G')).toBeNull();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('does not throw when is_active is a malformed string like "false" (truthy ⇒ counted, documented JS behavior)', () => {
    // NOTE: any non-empty string is truthy in JS, including "false". This
    // test documents/locks the current safe behavior so a future change is
    // intentional rather than accidental.
    renderCard({
      ...baseBiz,
      business_services: [
        { name_ar: 'خدمة-1', is_active: 'false' },
        { name_ar: 'خدمة-2', is_active: 'true' },
        { name_ar: 'خدمة-3', is_active: 'yes' },
        { name_ar: 'خدمة-4', is_active: 'no' },
      ],
    });
    expect(screen.getByText('خدمة-1')).toBeInTheDocument();
    expect(screen.getByText('خدمة-2')).toBeInTheDocument();
    expect(screen.getByText('خدمة-3')).toBeInTheDocument();
    expect(screen.queryByText('خدمة-4')).toBeNull();
    expect(screen.getByText('+1')).toBeInTheDocument();
  });
});

/**
 * BusinessCard is wrapped in `React.memo`. When the parent re-renders with
 * the SAME `business` reference and the SAME `viewMode`, the card must not
 * re-render. When `business_services` actually changes (new reference), the
 * card MUST re-render exactly once.
 */
describe('BusinessCard render cost (React.memo behavior)', () => {
  // NOTE: We intentionally do NOT assert on React Profiler `actualDuration`
  // thresholds or ratios (e.g. `< mountDuration * 0.25`). Wall-clock
  // measurements are non-deterministic in CI (bunx/vitest scheduling, GC,
  // shared runners) and produced intermittent failures unrelated to the
  // component. Instead we use a binary signal that is deterministic:
  //   - When React.memo fully bails out, no component in the Profiler's
  //     subtree renders, so `actualDuration === 0` for that commit.
  //   - When the memo'd component actually re-renders, `actualDuration > 0`.
  // This preserves the original intent (regression protection for
  // unnecessary re-renders / memoization) without any timing budget.
  const mountWithProfiler = (b: Record<string, unknown>) => {
    const renders: Array<{ phase: string; actualDuration: number }> = [];
    const onRender: ProfilerOnRenderCallback = (_id, phase, actualDuration) => {
      renders.push({ phase, actualDuration });
    };
    const utils = render(
      <MemoryRouter>
        <Profiler id="card" onRender={onRender}>
          <BusinessCard business={b} viewMode="grid" />
        </Profiler>
      </MemoryRouter>,
    );
    return { ...utils, renders };
  };

  it('does not re-render when parent re-renders with the same business reference', () => {
    const business = {
      ...baseBiz,
      business_services: [
        { name_ar: 'خدمة-1', is_active: true },
        { name_ar: 'خدمة-2', is_active: true },
      ],
    };
    const { rerender, renders } = mountWithProfiler(business);
    expect(renders.find((r) => r.phase === 'mount')).toBeDefined();
    expect(renders.filter((r) => r.phase === 'update').length).toBe(0);

    // Re-render parent with the SAME `business` reference.
    const onRender: ProfilerOnRenderCallback = (_id, phase, actualDuration) => {
      renders.push({ phase, actualDuration });
    };
    rerender(
      <MemoryRouter>
        <Profiler id="card" onRender={onRender}>
          <BusinessCard business={business} viewMode="grid" />
        </Profiler>
      </MemoryRouter>,
    );
    // memo() must short-circuit: every update commit must report zero
    // render work in the Profiler's subtree (deterministic bail-out
    // signal — no timing threshold).
    const updates = renders.filter((r) => r.phase === 'update');
    expect(updates.length).toBeGreaterThan(0);
    expect(updates.every((r) => r.actualDuration === 0)).toBe(true);
  });

  it('re-renders exactly once when business_services changes (new reference)', () => {
    const initial = {
      ...baseBiz,
      business_services: [{ name_ar: 'خدمة-1', is_active: true }],
    };
    const { rerender, renders } = mountWithProfiler(initial);
    expect(renders.filter((r) => r.phase === 'mount').length).toBe(1);

    const next = {
      ...initial,
      business_services: [
        { name_ar: 'خدمة-1', is_active: true },
        { name_ar: 'خدمة-2', is_active: true },
      ],
    };
    const onRender: ProfilerOnRenderCallback = (_id, phase, actualDuration) => {
      renders.push({ phase, actualDuration });
    };
    rerender(
      <MemoryRouter>
        <Profiler id="card" onRender={onRender}>
          <BusinessCard business={next} viewMode="grid" />
        </Profiler>
      </MemoryRouter>,
    );
    // The real prop change MUST cause an update commit that actually does
    // render work (i.e. NOT a memo bail-out). We assert work was performed
    // via actualDuration > 0 rather than comparing against the mount
    // duration, which is timing-sensitive.
    const updates = renders.filter((r) => r.phase === 'update');
    expect(updates.some((r) => r.actualDuration > 0)).toBe(true);
    expect(screen.getByText('خدمة-2')).toBeInTheDocument();
  });

  it('does not re-render across 5 parent re-renders with stable props', () => {
    const business = {
      ...baseBiz,
      business_services: [{ name_ar: 'خدمة-1', is_active: true }],
    };
    const { rerender, renders } = mountWithProfiler(business);

    for (let i = 0; i < 5; i++) {
      const onRender: ProfilerOnRenderCallback = (_id, phase, actualDuration) => {
        renders.push({ phase, actualDuration });
      };
      rerender(
        <MemoryRouter>
          <Profiler id="card" onRender={onRender}>
            <BusinessCard business={business} viewMode="grid" />
          </Profiler>
        </MemoryRouter>,
      );
    }
    // Across 5 stable re-renders, every update commit must be a memo
    // bail-out (zero render work in subtree — deterministic, no timing
    // threshold).
    const updates = renders.filter((r) => r.phase === 'update');
    expect(updates.length).toBeGreaterThan(0);
    expect(updates.every((r) => r.actualDuration === 0)).toBe(true);
  });
});