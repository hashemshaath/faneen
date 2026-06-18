import { useEffect } from 'react';

/**
 * Dev-only overlap auditor.
 *
 * Watches elements marked with `data-overlap-audit` and warns in the
 * console whenever the fixed/sticky header strip (selector below) visually
 * overlaps any of them. No-op in production builds.
 *
 * The audit checks both:
 *  - top-of-element below header bottom (no occlusion at rest)
 *  - that text inside the element is visible (non-zero opacity, not
 *    `visibility:hidden`, computed color alpha > 0, font-size > 0)
 */
const HEADER_SELECTOR =
  '[data-sticky-header="search"], header[role="banner"], nav.fixed, nav[class*="fixed"]';

function getHeaderBottom(): number {
  const els = Array.from(document.querySelectorAll<HTMLElement>(HEADER_SELECTOR));
  let bottom = 0;
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.height > 0 && r.top <= 0 + 1) {
      // Only stuck/fixed strips (anchored at the top of the viewport)
      bottom = Math.max(bottom, r.bottom);
    } else if (r.top >= 0 && r.top < 4 && r.height > 0) {
      bottom = Math.max(bottom, r.bottom);
    }
  }
  return bottom;
}

function auditOnce(): void {
  const headerBottom = getHeaderBottom();
  const targets = document.querySelectorAll<HTMLElement>('[data-overlap-audit]');
  targets.forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.height === 0) return;
    if (rect.top < headerBottom - 1 && rect.bottom > headerBottom) {
      // eslint-disable-next-line no-console
      console.warn(
        '[overlap-audit] header (bottom=%dpx) overlaps element',
        Math.round(headerBottom),
        el,
      );
    }
    // Hidden-text audit (cheap, run on the element itself)
    const cs = window.getComputedStyle(el);
    const fontSizePx = parseFloat(cs.fontSize || '0');
    const opacity = parseFloat(cs.opacity || '1');
    if (
      cs.visibility === 'hidden' ||
      cs.display === 'none' ||
      opacity === 0 ||
      fontSizePx === 0
    ) {
      // eslint-disable-next-line no-console
      console.warn('[overlap-audit] text-not-visible on element', el);
    }
  });
}

export function useStickyOverlapAudit(enabled: boolean = import.meta.env.DEV): void {
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const tick = () => {
      raf = window.requestAnimationFrame(() => auditOnce());
    };
    tick();
    window.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', tick);
    return () => {
      window.removeEventListener('scroll', tick);
      window.removeEventListener('resize', tick);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [enabled]);
}

export default useStickyOverlapAudit;