import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Input } from '../input';

/**
 * RTL/LTR — Phase 4 guard: technical input types must default to dir="ltr"
 * even inside an Arabic (RTL) document, so emails / phones / URLs / numbers
 * never render mirrored inside an RTL paragraph context. Text inputs stay
 * unset (inherit document direction) unless caller passes `dir`.
 */
describe('<Input> direction defaults', () => {
  const types = ['email', 'url', 'tel', 'number', 'date', 'time'] as const;

  for (const t of types) {
    it(`forces dir="ltr" for type="${t}"`, () => {
      const { container } = render(<Input type={t} defaultValue="" />);
      expect(container.querySelector('input')?.getAttribute('dir')).toBe('ltr');
    });
  }

  it('defaults type="text" to dir="auto" for safe mixed-content rendering', () => {
    // Global Forms RTL/LTR Hotfix — free-form text inputs use `auto` so
    // mixed Arabic/Latin content never renders mirrored inside an RTL
    // paragraph context. Explicit `dir` overrides still win.
    const { container } = render(<Input type="text" />);
    expect(container.querySelector('input')?.getAttribute('dir')).toBe('auto');
  });

  it('respects an explicit dir override (e.g. RTL Arabic name field)', () => {
    const { container } = render(<Input type="email" dir="rtl" />);
    expect(container.querySelector('input')?.getAttribute('dir')).toBe('rtl');
  });

  it('passes dir="auto" through unchanged for mixed-content fields', () => {
    const { container } = render(<Input dir="auto" />);
    expect(container.querySelector('input')?.getAttribute('dir')).toBe('auto');
  });
});