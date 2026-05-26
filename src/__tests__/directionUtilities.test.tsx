import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
  getDirection, isRTL, getDocumentLang, getLogicalAlign,
  isTechnicalValue, RTL_LANGS, REFERENCE_ID_PATTERN,
} from '@/lib/direction';
import { BidiText } from '@/components/ui/bidi-text';
import { TechnicalText } from '@/components/ui/technical-text';
import { ReferenceText } from '@/components/ui/reference-text';

describe('direction.ts pure helpers', () => {
  it('getDirection maps ar/he/fa/ur to rtl', () => {
    for (const lang of RTL_LANGS) expect(getDirection(lang)).toBe('rtl');
    expect(getDirection('ar-SA')).toBe('rtl');
    expect(getDirection('he_IL')).toBe('rtl');
  });
  it('getDirection maps everything else to ltr', () => {
    for (const lang of ['en', 'en-US', 'fr', 'de', '', null, undefined]) {
      expect(getDirection(lang as string)).toBe('ltr');
    }
  });
  it('isRTL mirrors getDirection', () => {
    expect(isRTL('ar')).toBe(true);
    expect(isRTL('en-US')).toBe(false);
  });
  it('getDocumentLang returns ar | en only', () => {
    expect(getDocumentLang('ar')).toBe('ar');
    expect(getDocumentLang('ar-SA')).toBe('ar');
    expect(getDocumentLang('en-US')).toBe('en');
    expect(getDocumentLang('fr')).toBe('en');
  });
  it('getLogicalAlign exposes text-start / text-end', () => {
    expect(getLogicalAlign(true)).toEqual({ start: 'text-start', end: 'text-end' });
  });
  it('isTechnicalValue detects refs, emails, URLs, UUIDs, phones', () => {
    expect(isTechnicalValue('USR-1000001')).toBe(true);
    expect(isTechnicalValue('ENT-2000003')).toBe(true);
    expect(isTechnicalValue('PAY-9000123')).toBe(true);
    expect(isTechnicalValue('foo@bar.com')).toBe(true);
    expect(isTechnicalValue('https://qitaat.com/x')).toBe(true);
    expect(isTechnicalValue('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isTechnicalValue('+966500000000')).toBe(true);
    expect(isTechnicalValue('شركة مشفى لتقنية المعلومات')).toBe(false);
  });
  it('REFERENCE_ID_PATTERN matches all standard prefixes', () => {
    for (const p of ['USR', 'ENT', 'BIZ', 'PAY', 'STF', 'LOC', 'QTE', 'INV']) {
      expect(REFERENCE_ID_PATTERN.test(`${p}-1000001`)).toBe(true);
    }
    expect(REFERENCE_ID_PATTERN.test('XYZ-1')).toBe(false);
  });
});

describe('BidiText component', () => {
  it('renders dir="auto" with .bidi-auto class', () => {
    const { container } = render(<BidiText>شركة Acme Co.</BidiText>);
    const el = container.firstElementChild!;
    expect(el.getAttribute('dir')).toBe('auto');
    expect(el.className).toContain('bidi-auto');
  });
});

describe('TechnicalText component', () => {
  it('forces dir="ltr" and .technical-ltr', () => {
    const { container } = render(<TechnicalText>foo@bar.com</TechnicalText>);
    const el = container.firstElementChild!;
    expect(el.getAttribute('dir')).toBe('ltr');
    expect(el.className).toContain('technical-ltr');
    expect(el.className).toContain('tech-content');
  });
});

describe('ReferenceText component', () => {
  it('renders the reference value verbatim, LTR', () => {
    const { container } = render(<ReferenceText value="USR-1000001" />);
    const el = container.firstElementChild!;
    expect(el.getAttribute('dir')).toBe('ltr');
    expect(el.getAttribute('data-reference')).toBe('true');
    expect(el.textContent).toBe('USR-1000001');
  });
  it('does not alter the displayed text', () => {
    for (const v of ['ENT-2000003', 'PAY-9000123', '550e8400-e29b-41d4-a716-446655440000']) {
      const { container } = render(<ReferenceText value={v} />);
      expect(container.firstElementChild!.textContent).toBe(v);
    }
  });
});