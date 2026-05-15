import { describe, it, expect } from 'vitest';
import { buildBadgeHtml, buildBadgeSvg } from '@/lib/badge/snippets';

/**
 * Regression tests for the stored-XSS finding (xss_badge_displayname).
 * Business names are user-controlled and flow into snippet output that the
 * public /v/b/:username page renders via dangerouslySetInnerHTML. The
 * builder MUST escape them so attacker payloads cannot break out of the
 * surrounding text node.
 */

const PAYLOADS = [
  `<img src=x onerror=alert(1)>`,
  `</span><script>alert(1)</script>`,
  `"><svg/onload=alert(1)>`,
  `' onclick='alert(1)`,
];

const baseOpts = {
  username: 'acme',
  variant: 'light' as const,
  size: 'md' as const,
  accent: 'emerald' as const,
  isRTL: false,
  showSubLabel: true,
};

describe('badge snippets — XSS regression', () => {
  for (const payload of PAYLOADS) {
    it(`escapes displayName in HTML output: ${payload.slice(0, 24)}…`, () => {
      const html = buildBadgeHtml({ ...baseOpts, displayName: payload });
      // Raw payload must never appear unescaped inside the rendered HTML.
      expect(html).not.toContain(payload);
      // No executable HTML tag injected from displayName.
      expect(html).not.toMatch(/<script\b/i);
      expect(html).not.toMatch(/<img\s+src=x/i);
      expect(html).not.toMatch(/<svg\/onload/i);
      // Critical chars must be entity-escaped.
      if (payload.includes('<')) expect(html).toContain('&lt;');
      if (payload.includes('"')) expect(html).toContain('&quot;');
    });

    it(`escapes displayName in SVG output: ${payload.slice(0, 24)}…`, () => {
      const svg = buildBadgeSvg({ ...baseOpts, displayName: payload });
      expect(svg).not.toContain(payload);
      expect(svg).not.toMatch(/<script\b/i);
    });
  }

  it('preserves benign Arabic/Latin display names verbatim (escaped)', () => {
    const html = buildBadgeHtml({ ...baseOpts, displayName: 'Acme & Co.' });
    expect(html).toContain('Acme &amp; Co.');
  });
});