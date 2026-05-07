import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BusinessCard } from './BusinessCard';

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