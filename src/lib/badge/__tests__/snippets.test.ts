import { describe, it, expect } from 'vitest';
import { buildBadgeHtml, buildProfileLink, buildBadgeMarkdown } from '../snippets';

const opts = {
  username: 'acme', displayName: 'Acme Workshop',
  variant: 'light' as const, size: 'md' as const, accent: 'emerald' as const,
  isRTL: false, showSubLabel: true,
};

describe('badge snippets', () => {
  it('builds profile link with badge ref + utm', () => {
    const link = buildProfileLink('acme');
    expect(link).toContain('/acme');
    expect(link).toContain('ref=badge');
    expect(link).toContain('utm_source=workshop_site');
  });

  it('html snippet includes accessible anchor + tracking pixel', () => {
    const html = buildBadgeHtml(opts);
    expect(html).toMatch(/<a [^>]*href=/);
    expect(html).toContain('rel="noopener"');
    expect(html).toContain('badge-pixel');
    expect(html).toContain('Verified on Qitaat');
  });

  it('markdown snippet links to profile', () => {
    const md = buildBadgeMarkdown(opts);
    expect(md).toContain('](');
    expect(md).toContain('ref=badge');
  });

  it('escapes display name in title attribute', () => {
    const html = buildBadgeHtml({ ...opts, displayName: 'A & B "Co"' });
    expect(html).toContain('A &amp; B &quot;Co&quot;');
  });
});
