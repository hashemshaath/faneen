import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BusinessCard } from './BusinessCard';

/**
 * Integration-style test for the search results grid.
 *
 * Instead of mounting the full /search page (which pulls in Supabase, lazy
 * routes, providers, and heavy filters), we render the same `BusinessCard`
 * component in the same grid layout the page uses, and feed it a realistic
 * mixed dataset. This exercises the cross-cutting badge rules:
 *
 *   - "موثقة"  → only when `is_verified === true`
 *   - "كوبون"  → only when `promotions[]` has an active, non-expired entry
 *   - service tag chips + "+N" → only active services, top-3 visible
 *
 * across many cards at once, so a regression in one card's logic surfaces
 * as the wrong total badge count.
 */

vi.mock('@/i18n/LanguageContext', () => ({
  useLanguage: () => ({ language: 'ar', isRTL: true }),
}));
vi.mock('@/hooks/useBusinessFavorites', () => ({
  useBusinessFavorites: () => ({ isFavorite: () => false, toggleFavorite: () => false }),
}));
vi.mock('@/hooks/useRecentlyViewedBusinesses', () => ({
  useRecentlyViewedBusinesses: () => ({ track: () => {} }),
}));
vi.mock('sonner', () => ({ toast: { success: () => {} } }));

const today = new Date().toISOString().slice(0, 10);
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

/** Mixed fixture covering every relevant permutation. */
const fixtures = [
  // 1. Verified + active coupon + 5 active services (expect +2)
  {
    id: 'b1',
    username: 'alpha',
    name_ar: 'ألفا',
    rating_avg: 4.8,
    rating_count: 120,
    is_verified: true,
    membership_tier: 'basic',
    cities: { name_ar: 'الرياض' },
    categories: { name_ar: 'ألمنيوم' },
    business_services: [
      { name_ar: 'تركيب', is_active: true },
      { name_ar: 'صيانة', is_active: true },
      { name_ar: 'تصميم', is_active: true },
      { name_ar: 'توريد', is_active: true },
      { name_ar: 'استشارات', is_active: true },
    ],
    promotions: [{ id: 'p', is_active: true, end_date: tomorrow }],
  },
  // 2. Verified only, no coupon, no services
  {
    id: 'b2',
    username: 'beta',
    name_ar: 'بيتا',
    rating_avg: 4.0,
    rating_count: 5,
    is_verified: true,
    membership_tier: 'basic',
    cities: { name_ar: 'جدة' },
    categories: { name_ar: 'زجاج' },
    business_services: [],
    promotions: [],
  },
  // 3. Coupon today (boundary), not verified, 3 active services (no +N)
  {
    id: 'b3',
    username: 'gamma',
    name_ar: 'غاما',
    rating_avg: 3.5,
    rating_count: 12,
    is_verified: false,
    membership_tier: 'basic',
    cities: { name_ar: 'الدمام' },
    categories: { name_ar: 'خشب' },
    business_services: [
      { name_ar: 'قص', is_active: true },
      { name_ar: 'تشطيب', is_active: true },
      { name_ar: 'تجميع', is_active: true },
    ],
    promotions: [{ id: 'p', is_active: true, end_date: today }],
  },
  // 4. Expired coupon + inactive promotion → no coupon badge
  {
    id: 'b4',
    username: 'delta',
    name_ar: 'دلتا',
    rating_avg: 2.0,
    rating_count: 1,
    is_verified: false,
    membership_tier: 'basic',
    cities: { name_ar: 'مكة' },
    categories: { name_ar: 'حديد' },
    business_services: [
      { name_ar: 'لحام', is_active: true },
      { name_ar: 'قديم', is_active: false },
    ],
    promotions: [
      { id: 'p1', is_active: true, end_date: yesterday },
      { id: 'p2', is_active: false, end_date: tomorrow },
    ],
  },
  // 5. No badges, no services at all
  {
    id: 'b5',
    username: 'epsilon',
    name_ar: 'إبسلون',
    rating_avg: 0,
    rating_count: 0,
    is_verified: false,
    membership_tier: 'basic',
    cities: { name_ar: 'تبوك' },
    categories: { name_ar: 'ألمنيوم' },
    business_services: null,
    promotions: undefined,
  },
  // 6. 7 active services + 3 inactive → expect +4
  {
    id: 'b6',
    username: 'zeta',
    name_ar: 'زيتا',
    rating_avg: 4.6,
    rating_count: 30,
    is_verified: true,
    membership_tier: 'basic',
    cities: { name_ar: 'الرياض' },
    categories: { name_ar: 'زجاج' },
    business_services: [
      ...Array.from({ length: 7 }, (_, i) => ({ name_ar: `خدمة-${i + 1}`, is_active: true })),
      ...Array.from({ length: 3 }, (_, i) => ({ name_ar: `معطل-${i + 1}`, is_active: false })),
    ],
    promotions: [{ id: 'p', is_active: true, end_date: tomorrow }],
  },
];

const renderResults = () =>
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ul data-testid="results-grid" className="grid grid-cols-2 gap-4">
        {fixtures.map((b) => (
          <li key={b.id} data-testid={`card-${b.id}`}>
            <BusinessCard business={b} viewMode="grid" />
          </li>
        ))}
      </ul>
    </MemoryRouter>,
  );

afterEach(() => vi.useRealTimers());

describe('Search results — badge & tag consistency across mixed data', () => {
  it('renders all cards', () => {
    renderResults();
    fixtures.forEach((b) => {
      expect(screen.getByTestId(`card-${b.id}`)).toBeInTheDocument();
    });
  });

  it('shows "موثقة" exactly on verified businesses', () => {
    renderResults();
    // grid view renders text "شركة موثقة"
    const verifiedBadges = screen.getAllByText('شركة موثقة');
    // b1, b2, b6 are verified
    expect(verifiedBadges).toHaveLength(3);

    // Per-card assertion
    expect(within(screen.getByTestId('card-b1')).getByText('شركة موثقة')).toBeInTheDocument();
    expect(within(screen.getByTestId('card-b3')).queryByText('شركة موثقة')).toBeNull();
    expect(within(screen.getByTestId('card-b4')).queryByText('شركة موثقة')).toBeNull();
  });

  it('shows "كوبون خصم" only for active, non-expired promotions', () => {
    renderResults();
    const couponBadges = screen.getAllByText('كوبون خصم');
    // b1 (tomorrow), b3 (today), b6 (tomorrow) → 3
    expect(couponBadges).toHaveLength(3);

    expect(within(screen.getByTestId('card-b3')).getByText('كوبون خصم')).toBeInTheDocument();
    expect(within(screen.getByTestId('card-b4')).queryByText('كوبون خصم')).toBeNull();
    expect(within(screen.getByTestId('card-b5')).queryByText('كوبون خصم')).toBeNull();
  });

  it('caps visible service tags at 3 and computes +N from active services only', () => {
    renderResults();

    // b1: 5 active → +2
    expect(within(screen.getByTestId('card-b1')).getByText('+2')).toBeInTheDocument();
    // b3: 3 active → no +N
    expect(within(screen.getByTestId('card-b3')).queryByText(/^\+\d+$/)).toBeNull();
    // b4: 1 active (inactive ignored) → no +N
    expect(within(screen.getByTestId('card-b4')).queryByText(/^\+\d+$/)).toBeNull();
    expect(within(screen.getByTestId('card-b4')).queryByText('قديم')).toBeNull();
    // b6: 7 active + 3 inactive → +4
    expect(within(screen.getByTestId('card-b6')).getByText('+4')).toBeInTheDocument();
    // b5: no services → no chips, no +N
    expect(within(screen.getByTestId('card-b5')).queryByText(/^\+\d+$/)).toBeNull();
  });

  it('total +N counters across the grid match expected values', () => {
    renderResults();
    const overflows = screen.getAllByText(/^\+\d+$/).map((el) => el.textContent);
    // Only b1 (+2) and b6 (+4) produce overflow chips
    expect(overflows.sort()).toEqual(['+2', '+4']);
  });
});