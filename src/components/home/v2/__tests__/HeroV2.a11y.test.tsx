import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'jest-axe';
import { HeroV2 } from '../HomeV2';
import { LanguageProvider } from '@/i18n/LanguageContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const renderHero = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
        <LanguageProvider>
          <MemoryRouter>
            <HeroV2 />
          </MemoryRouter>
        </LanguageProvider>
    </QueryClientProvider>,
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
    const input = screen.getByRole('combobox');
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

  it('uses #hero-live-region as the ONLY announcer inside the carousel', () => {
    renderHero();
    const carousel = document.getElementById('hero-carousel')!;
    // Anything that would speak to AT: role=status, role=alert, or aria-live
    const announcers = carousel.querySelectorAll(
      '[role="status"], [role="alert"], [aria-live="polite"], [aria-live="assertive"]',
    );
    // Autocomplete status (#hero-ac-status) lives OUTSIDE the carousel region,
    // so the carousel should expose exactly one announcer: #hero-live-region.
    expect(announcers.length).toBe(1);
    expect((announcers[0] as HTMLElement).id).toBe('hero-live-region');
  });

  it('does not re-announce the previous slide after Next then Prev navigation', async () => {
    vi.useFakeTimers();
    try {
      renderHero();
      const live = document.getElementById('hero-live-region')!;

      // Initial commit (slide 1) is synchronous via lazy state initializer
      const initial = live.textContent ?? '';
      expect(initial).toMatch(/(الشريحة|Slide)\s*1/);

      const nextBtn = screen.getByLabelText(/Next slide|الشريحة التالية/);
      const prevBtn = screen.getByLabelText(/Previous slide|الشريحة السابقة/);

      // Forward → wait past the 450ms debounce → live region speaks slide 2
      await act(async () => { fireEvent.click(nextBtn); });
      await act(async () => { vi.advanceTimersByTime(500); });
      const afterNext = live.textContent ?? '';
      expect(afterNext).toMatch(/(الشريحة|Slide)\s*2/);
      expect(afterNext).not.toBe(initial);

      // Backward → live region speaks slide 1 once, NOT slide 2 again
      await act(async () => { fireEvent.click(prevBtn); });
      await act(async () => { vi.advanceTimersByTime(500); });
      const afterPrev = live.textContent ?? '';
      expect(afterPrev).toMatch(/(الشريحة|Slide)\s*1/);
      // Previous slide (slide 2) text must not linger in the live region
      expect(afterPrev).not.toMatch(/(الشريحة|Slide)\s*2/);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not re-announce the same slide on incidental re-renders', async () => {
    vi.useFakeTimers();
    try {
      const { rerender } = renderHero();
      const live = document.getElementById('hero-live-region')!;
      const before = live.textContent ?? '';
      expect(before).toMatch(/(الشريحة|Slide)\s*1/);

      // Force a parent re-render without changing the active slide
      const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      rerender(
        <QueryClientProvider client={qc}>
          <LanguageProvider>
            <MemoryRouter>
              <HeroV2 />
            </MemoryRouter>
          </LanguageProvider>
        </QueryClientProvider>,
      );
      await act(async () => { vi.advanceTimersByTime(500); });

      const after = document.getElementById('hero-live-region')!.textContent ?? '';
      // Same text → no diff for the screen reader to re-announce.
      expect(after).toBe(before);
    } finally {
      vi.useRealTimers();
    }
  });
});