import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  sanitizeBlogHtml,
  sanitizeSvgMarkup,
  sanitizeBadgeHtml,
} from '../sanitizeHtml';

const ROOT = resolve(__dirname, '../../../../');
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf8');

describe('sanitizeBlogHtml', () => {
  it('removes <script> tags', () => {
    const out = sanitizeBlogHtml('<p>ok</p><script>alert(1)</script>');
    expect(out).not.toMatch(/<script/i);
    expect(out).toContain('<p>ok</p>');
  });

  it('strips inline event handlers', () => {
    const out = sanitizeBlogHtml('<a href="/x" onclick="alert(1)">x</a>');
    expect(out).not.toMatch(/onclick/i);
    expect(out).toMatch(/href="\/x"/);
  });

  it('blocks javascript: URLs', () => {
    const out = sanitizeBlogHtml('<a href="javascript:alert(1)">x</a>');
    expect(out).not.toMatch(/javascript:/i);
  });

  it('blocks iframes', () => {
    const out = sanitizeBlogHtml('<iframe src="https://evil"></iframe><p>k</p>');
    expect(out).not.toMatch(/<iframe/i);
    expect(out).toContain('<p>k</p>');
  });

  it('preserves common blog tags', () => {
    const html = '<h2>T</h2><p>p</p><ul><li>i</li></ul><strong>b</strong><a href="https://x.com">l</a>';
    const out = sanitizeBlogHtml(html);
    for (const t of ['<h2>', '<p>', '<ul>', '<li>', '<strong>', '<a ']) {
      expect(out).toContain(t);
    }
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeBlogHtml('')).toBe('');
  });
});

describe('sanitizeSvgMarkup', () => {
  it('removes <script> inside svg', () => {
    const out = sanitizeSvgMarkup('<svg><script>alert(1)</script><rect/></svg>');
    expect(out).not.toMatch(/<script/i);
    expect(out).toMatch(/<svg/i);
  });

  it('removes onload and onerror attributes', () => {
    const out = sanitizeSvgMarkup('<svg onload="alert(1)"><image onerror="x()" href="/a"/></svg>');
    expect(out).not.toMatch(/onload/i);
    expect(out).not.toMatch(/onerror/i);
  });
});

describe('sanitizeBadgeHtml', () => {
  it('removes scripts but keeps anchor and svg structure', () => {
    const out = sanitizeBadgeHtml('<a href="https://q.com"><svg viewBox="0 0 1 1"><rect/></svg></a><script>x</script>');
    expect(out).not.toMatch(/<script/i);
    expect(out).toMatch(/<a /);
    expect(out).toMatch(/<svg/);
  });

  it('blocks javascript: URLs in anchors', () => {
    const out = sanitizeBadgeHtml('<a href="javascript:alert(1)">x</a>');
    expect(out).not.toMatch(/javascript:/i);
  });
});

describe('XSS surface guard — call sites must use helper', () => {
  const targets = [
    'src/components/blog/ArticlePreview.tsx',
    'src/pages/BlogPost.tsx',
    'src/components/client-sites/ClientSiteQrCard.tsx',
    'src/pages/dashboard/DashboardBadge.tsx',
    'src/modules/assets/components/AssetQrIdentity.tsx',
    'src/pages/VerifyBusiness.tsx',
  ];

  it('all targeted files import from @/lib/security/sanitizeHtml', () => {
    for (const rel of targets) {
      const src = read(rel);
      expect(src, rel).toMatch(/@\/lib\/security\/sanitizeHtml/);
    }
  });

  it('targeted files do not use raw DOMPurify.sanitize anymore', () => {
    for (const rel of targets) {
      const src = read(rel);
      expect(src, rel).not.toMatch(/DOMPurify\.sanitize\s*\(/);
    }
  });

  it('targeted files have no dangerouslySetInnerHTML without a sanitize* call on the same line', () => {
    for (const rel of targets) {
      const src = read(rel);
      const lines = src.split('\n');
      for (const [i, line] of lines.entries()) {
        if (line.includes('dangerouslySetInnerHTML')) {
          expect(/sanitize(Blog|Svg|Badge)/.test(line), `${rel}:${i + 1} -> ${line.trim()}`).toBe(true);
        }
      }
    }
  });
});

describe('frontend hygiene', () => {
  it('no service_role references in src/ production code', () => {
    // Re-uses ripgrep semantics via Node fs walk would be heavier; just guard
    // the supabase client + main entry which are the most likely leak points.
    const files = [
      'src/integrations/supabase/client.ts',
      'src/main.tsx',
      'src/lib/security/sanitizeHtml.ts',
    ];
    for (const rel of files) {
      expect(read(rel)).not.toMatch(/service_role/i);
    }
  });
});