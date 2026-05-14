import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'jest-axe';
import { HeroV2 } from '../HomeV2';
import { LanguageProvider } from '@/i18n/LanguageContext';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const renderHero = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={qc}>
        <LanguageProvider>
          <MemoryRouter>
            <HeroV2 />
          </MemoryRouter>
        </LanguageProvider>
      </QueryClientProvider>
    </HelmetProvider>,
  );
};

describe('HeroV2 — accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = renderHero();
    const results = await axe(container, {
      // Hero has decorative bg images intentionally without alt
      rules: { 'region': { enabled: false } },
    });
    expect(results).toHaveNoViolations();
  });

  it('exposes a single live region announcing the current slide', () => {
    renderHero();
    const live = document.getElementById('hero-live-region');
    expect(live).not.toBeNull();
    expect(live).toHaveAttribute('role', 'status');
    expect(live).toHaveAttribute('aria-atomic', 'true');
    // role="status" implies polite — explicit aria-live should NOT be present
    expect(live).not.toHaveAttribute('aria-live');
    expect(live!.textContent).toMatch(/(الشريحة|Slide)\s*1/);
  });

  it('marks the carousel region with a single aria-roledescription', () => {
    renderHero();
    const carousel = document.getElementById('hero-carousel');
    expect(carousel).not.toBeNull();
    expect(carousel).toHaveAttribute('aria-roledescription', 'carousel');
    expect(carousel).toHaveAttribute('role', 'region');
    // Outer <section> must NOT also declare carousel — would double-announce
    const outerSections = document.querySelectorAll('section[aria-roledescription="carousel"]');
    expect(outerSections.length).toBe(0);
  });

  it('wires the search input as a WAI-ARIA combobox', () => {
    renderHero();
    const input = screen.getByRole('searchbox');
    expect(input).toHaveAttribute('aria-autocomplete', 'list');
    expect(input).toHaveAttribute('aria-expanded');
    expect(input).toHaveAttribute('aria-controls', 'hero-ac-list');
  });

  it('gives every slide-navigation control an accessible name and aria-controls', () => {
    renderHero();
    const buttons = document.querySelectorAll('button[aria-controls="hero-carousel"]');
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach((b) => {
      const name = b.getAttribute('aria-label') ?? b.textContent ?? '';
      expect(name.trim().length).toBeGreaterThan(0);
    });
  });

  it('does not produce duplicate ids inside the hero', () => {
    const { container } = renderHero();
    const ids = Array.from(container.querySelectorAll('[id]')).map((el) => el.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes).toEqual([]);
  });
});