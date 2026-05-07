import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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