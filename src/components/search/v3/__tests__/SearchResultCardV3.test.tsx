import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/i18n/LanguageContext';
import { SearchResultCardV3, type SearchResultCardV3Business } from '../SearchResultCardV3';

const renderCard = (
  overrides: Partial<SearchResultCardV3Business> = {},
  taxonomy?: Parameters<typeof SearchResultCardV3>[0]['taxonomy'],
) => {
  const business: SearchResultCardV3Business = {
    id: 'b1',
    username: 'aja',
    name_ar: 'مصنع أجا',
    name_en: 'Aja Factory',
    description_ar: 'وصف بالعربية',
    description_en: 'English description',
    logo_url: null,
    rating_avg: 4.7,
    rating_count: 23,
    is_verified: true,
    cities: { name_ar: 'الرياض', name_en: 'Riyadh' },
    ...overrides,
  };
  return render(
    <LanguageProvider>
      <MemoryRouter>
        <SearchResultCardV3 business={business} taxonomy={taxonomy} />
      </MemoryRouter>
    </LanguageProvider>,
  );
};

describe('SearchResultCardV3', () => {
  it('links via getBusinessProfileHref (/<username>) — never /q/', () => {
    renderCard();
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
    for (const a of links) {
      const href = a.getAttribute('href') || '';
      expect(href.startsWith('/q/')).toBe(false);
      expect(href === '/aja' || href.startsWith('/aja#') || href.startsWith('/aja/')).toBe(true);
    }
  });

  it('renders the verified badge when is_verified', () => {
    renderCard({ is_verified: true });
    // <VerifiedBadge> renders a ShieldCheck/BadgeCheck icon and exposes
    // the label via aria-label / title rather than visible text.
    expect(screen.getByLabelText(/موثقة|Verified/i)).toBeInTheDocument();
  });

  it('renders the name with dir="auto"', () => {
    renderCard();
    const link = screen.getAllByRole('link').find((a) => a.textContent?.includes('Aja') || a.textContent?.includes('أجا'));
    expect(link?.getAttribute('dir')).toBe('auto');
  });

  it('never renders the literal "غير مصنّف" even if taxonomy supplies it', () => {
    renderCard(
      {},
      {
        primaries: [],
        groups: [],
        primaryLabel: 'غير مصنّف',
        primarySlug: 'uncategorized',
        secondaryLabels: ['غير مصنّف', 'Uncategorized'],
        serviceLabels: [],
        hasModernTaxonomy: false,
      },
    );
    expect(screen.queryByText('غير مصنّف')).toBeNull();
    expect(screen.queryByText('Uncategorized')).toBeNull();
  });

  it('renders a clean taxonomy label when provided', () => {
    renderCard(
      {},
      {
        primaries: [],
        groups: [],
        primaryLabel: 'ألمنيوم',
        primarySlug: 'aluminum',
        secondaryLabels: ['نوافذ', 'واجهات'],
        serviceLabels: [],
        hasModernTaxonomy: true,
      },
    );
    expect(screen.getByText('ألمنيوم')).toBeInTheDocument();
    expect(screen.getByText('نوافذ')).toBeInTheDocument();
  });

  it('renders a non-link safe fallback when username is missing', () => {
    renderCard({ username: null });
    // No anchor should be present when there is no href
    expect(screen.queryByRole('link')).toBeNull();
  });
});