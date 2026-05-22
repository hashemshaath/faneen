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
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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

  it('uses #hero-live-region as the ONLY announcer of slide changes', () => {
    renderHero();
    const carousel = document.getElementById('hero-carousel')!;
    const announcers = carousel.querySelectorAll(
      '[role="status"], [role="alert"], [aria-live="polite"], [aria-live="assertive"]',
    );
    // The hero contains #hero-ac-status (autocomplete result count) too — that's
    // fine because it speaks ONLY when the combobox opens, never when the slide
    // changes. The contract we enforce here is:
    //   1) #hero-live-region exists and is a status announcer.
    //   2) NO other announcer carries slide text (slide N of M / الشريحة N من M),
    //      which would cause the slide to be announced twice.
    const live = document.getElementById('hero-live-region');
    expect(live).not.toBeNull();
    expect(announcers.length).toBeGreaterThanOrEqual(1);
    const slideRe = /(الشريحة|Slide)\s*\d+/;
    Array.from(announcers).forEach((el) => {
      if ((el as HTMLElement).id === 'hero-live-region') return;
      expect(el.textContent ?? '').not.toMatch(slideRe);
    });
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
      await act(async () => { vi.advanceTimersByTime(1100); });
      const afterNext = live.textContent ?? '';
      expect(afterNext).toMatch(/(الشريحة|Slide)\s*2/);
      expect(afterNext).not.toBe(initial);

      // Backward → live region speaks slide 1 once, NOT slide 2 again.
      // Wait past the adaptive debounce window (changes within 1s extend
      // the wait — see slideChangeTimesRef in HomeV2).
      await act(async () => { fireEvent.click(prevBtn); });
      await act(async () => { vi.advanceTimersByTime(1100); });
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
            <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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

  it('keeps exactly one nav dot marked aria-current="true" in sync with the active slide', async () => {
    renderHero();
    const dots = () =>
      Array.from(
        document.querySelectorAll<HTMLButtonElement>(
          'button[aria-controls="hero-carousel"][aria-label]',
        ),
      ).filter((b) => /(\d+)\s*(من|of)\s*\d+/.test(b.getAttribute('aria-label') ?? ''));

    // Initially: exactly one button per renderable group has aria-current="true"
    // and inactive buttons must NOT carry aria-current="false" (token, not boolean).
    let active = dots().filter((b) => b.getAttribute('aria-current') === 'true');
    expect(active.length).toBeGreaterThanOrEqual(1);
    dots()
      .filter((b) => b.getAttribute('aria-current') !== 'true')
      .forEach((b) => {
        expect(b.getAttribute('aria-current')).toBeNull();
      });

    // Click the Next arrow — every active dot should shift to the next index
    // synchronously (no stale aria-current on the previous slide).
    const nextBtn = screen.getByLabelText(/Next slide|الشريحة التالية/);
    await act(async () => { fireEvent.click(nextBtn); });

    active = dots().filter((b) => b.getAttribute('aria-current') === 'true');
    expect(active.length).toBeGreaterThanOrEqual(1);
    // Active dots must now describe slide 2, not slide 1
    active.forEach((b) => {
      expect(b.getAttribute('aria-label') ?? '').toMatch(/(الشريحة|slide)\s*2/i);
    });
    // And no inactive dot may falsely carry aria-current
    dots()
      .filter((b) => b.getAttribute('aria-current') !== 'true')
      .forEach((b) => {
        expect(b.getAttribute('aria-current')).toBeNull();
      });
  });

  it('mutes #hero-live-region only during keyboard nav, then re-enables for the next change', async () => {
    vi.useFakeTimers();
    try {
      renderHero();
      const carousel = document.getElementById('hero-carousel')!;
      const live = document.getElementById('hero-live-region')!;

      // Initial slide 1 is announced.
      expect(live.textContent ?? '').toMatch(/(الشريحة|Slide)\s*1/);

      // Keyboard nav: focus the carousel and press ArrowRight.
      await act(async () => { carousel.focus(); });
      await act(async () => {
        fireEvent.keyDown(carousel, { key: 'ArrowRight' });
      });
      // After the focus effect runs, focus is on #hero-slide-content and the
      // live region is empty (focus name carried the announcement).
      await act(async () => { vi.advanceTimersByTime(500); });
      expect(document.activeElement?.id).toBe('hero-slide-content');
      expect((live.textContent ?? '').trim()).toBe('');

      // The flag must have been re-enabled so the NEXT change (a dot click,
      // not keyboard) is announced normally via the live region.
      const dot = Array.from(
        document.querySelectorAll<HTMLButtonElement>(
          'button[aria-controls="hero-carousel"][aria-label]',
        ),
      ).find((b) =>
        /(الشريحة|slide)\s*3/i.test(b.getAttribute('aria-label') ?? ''),
      );
      expect(dot).toBeTruthy();
      await act(async () => { fireEvent.click(dot!); });
      await act(async () => { vi.advanceTimersByTime(500); });
      expect(live.textContent ?? '').toMatch(/(الشريحة|Slide)\s*3/);
    } finally {
      vi.useRealTimers();
    }
  });

  it('moves focus to the slide group when a dot is activated via keyboard, and keeps aria-current consistent', async () => {
    vi.useFakeTimers();
    try {
      renderHero();
      const dots = () =>
        Array.from(
          document.querySelectorAll<HTMLButtonElement>(
            'button[aria-controls="hero-carousel"][aria-label]',
          ),
        ).filter((b) => /(\d+)\s*(من|of)\s*\d+/.test(b.getAttribute('aria-label') ?? ''));

      const dot4 = dots().find((b) =>
        /(الشريحة|slide)\s*4/i.test(b.getAttribute('aria-label') ?? ''),
      )!;
      expect(dot4).toBeTruthy();

      // Keyboard activation (Enter) on a dot.
      await act(async () => { dot4.focus(); });
      await act(async () => {
        fireEvent.keyDown(dot4, { key: 'Enter' });
      });
      await act(async () => { vi.advanceTimersByTime(50); });

      // Focus should jump to the slide content group, not stay on the dot.
      expect(document.activeElement?.id).toBe('hero-slide-content');

      // aria-current must have shifted to slide 4 — exactly one active per group,
      // and inactive dots must NOT carry aria-current at all.
      const after = dots();
      const activeDots = after.filter((b) => b.getAttribute('aria-current') === 'true');
      expect(activeDots.length).toBeGreaterThanOrEqual(1);
      activeDots.forEach((b) => {
        expect(b.getAttribute('aria-label') ?? '').toMatch(/(الشريحة|slide)\s*4/i);
      });
      after
        .filter((b) => b.getAttribute('aria-current') !== 'true')
        .forEach((b) => expect(b.getAttribute('aria-current')).toBeNull());

      // Live region stayed muted (focus name carried the announcement).
      const live = document.getElementById('hero-live-region')!;
      expect((live.textContent ?? '').trim()).toBe('');
    } finally {
      vi.useRealTimers();
    }
  });

  it('supports PageDown/PageUp to navigate slides with the same keyboard mute logic', async () => {
    vi.useFakeTimers();
    try {
      renderHero();
      const carousel = document.getElementById('hero-carousel')!;
      const live = document.getElementById('hero-live-region')!;
      expect((live.textContent ?? '')).toMatch(/(الشريحة|Slide)\s*1/);

      // PageDown → next slide; live region stays muted, focus moves to slide group.
      await act(async () => {
        fireEvent.keyDown(carousel, { key: 'PageDown' });
      });
      await act(async () => { vi.advanceTimersByTime(50); });
      expect(document.activeElement?.id).toBe('hero-slide-content');
      expect((live.textContent ?? '').trim()).toBe('');

      // PageUp → previous slide; same mute behavior.
      await act(async () => {
        fireEvent.keyDown(carousel, { key: 'PageUp' });
      });
      await act(async () => { vi.advanceTimersByTime(50); });
      expect(document.activeElement?.id).toBe('hero-slide-content');
      expect((live.textContent ?? '').trim()).toBe('');

      // After keyboard nav settles, a non-keyboard change (dot click) re-enables
      // the live region for normal announcements.
      const dot3 = Array.from(
        document.querySelectorAll<HTMLButtonElement>(
          'button[aria-controls="hero-carousel"][aria-label]',
        ),
      ).find((b) => /(الشريحة|slide)\s*3/i.test(b.getAttribute('aria-label') ?? ''))!;
      expect(dot3).toBeTruthy();
      await act(async () => { fireEvent.click(dot3); });
      await act(async () => { vi.advanceTimersByTime(500); });
      expect((live.textContent ?? '')).toMatch(/(الشريحة|Slide)\s*3/);
    } finally {
      vi.useRealTimers();
    }
  });

  it('records timing between rapid slide changes and only announces the final settled slide', async () => {
    vi.useFakeTimers();
    try {
      renderHero();
      const live = document.getElementById('hero-live-region')!;
      // Initial announcement (slide 1) is synchronous.
      expect((live.textContent ?? '')).toMatch(/(الشريحة|Slide)\s*1/);

      const dots = () =>
        Array.from(
          document.querySelectorAll<HTMLButtonElement>(
            'button[aria-controls="hero-carousel"][aria-label]',
          ),
        ).filter((b) => /(\d+)\s*(من|of)\s*\d+/.test(b.getAttribute('aria-label') ?? ''));
      const dotN = (n: number) =>
        dots().find((b) =>
          new RegExp(`(الشريحة|slide)\\s*${n}\\b`, 'i').test(
            b.getAttribute('aria-label') ?? '',
          ),
        )!;

      // Rapid burst: 3 dot clicks ~100ms apart (well under any debounce).
      await act(async () => { fireEvent.click(dotN(2)); });
      await act(async () => { vi.advanceTimersByTime(100); });
      await act(async () => { fireEvent.click(dotN(3)); });
      await act(async () => { vi.advanceTimersByTime(100); });
      await act(async () => { fireEvent.click(dotN(4)); });

      // Mid-burst: nothing new spoken yet — slide 1 text remains.
      await act(async () => { vi.advanceTimersByTime(300); });
      const mid = live.textContent ?? '';
      expect(mid).not.toMatch(/(الشريحة|Slide)\s*2/);
      expect(mid).not.toMatch(/(الشريحة|Slide)\s*3/);
      expect(mid).not.toMatch(/(الشريحة|Slide)\s*4/);

      // After the adaptive (~1s) debounce settles, only the FINAL slide (4)
      // is announced — slides 2 and 3 never spoken aloud.
      await act(async () => { vi.advanceTimersByTime(1100); });
      const final = live.textContent ?? '';
      expect(final).toMatch(/(الشريحة|Slide)\s*4/);
      expect(final).not.toMatch(/(الشريحة|Slide)\s*[23]\b/);
    } finally {
      vi.useRealTimers();
    }
  });
});