import { describe, it, expect } from 'vitest';
import { resolveFieldDirection } from '@/lib/field-direction';

describe('resolveFieldDirection — Global Forms RTL/LTR Hotfix', () => {
  it('returns ltr for technical input types', () => {
    for (const t of ['email', 'url', 'tel', 'number', 'date', 'time']) {
      expect(resolveFieldDirection({ type: t })).toBe('ltr');
    }
  });

  it('returns ltr for numeric / decimal / tel inputMode', () => {
    expect(resolveFieldDirection({ inputMode: 'numeric' })).toBe('ltr');
    expect(resolveFieldDirection({ inputMode: 'decimal' })).toBe('ltr');
    expect(resolveFieldDirection({ inputMode: 'tel' })).toBe('ltr');
  });

  it('returns rtl for *_ar field names', () => {
    expect(resolveFieldDirection({ name: 'name_ar' })).toBe('rtl');
    expect(resolveFieldDirection({ name: 'description_ar' })).toBe('rtl');
    expect(resolveFieldDirection({ id: 'title_ar_input' })).toBe('rtl');
  });

  it('returns ltr for *_en field names', () => {
    expect(resolveFieldDirection({ name: 'name_en' })).toBe('ltr');
    expect(resolveFieldDirection({ name: 'short_description_en' })).toBe('ltr');
    expect(resolveFieldDirection({ id: 'content_en_input' })).toBe('ltr');
  });

  it('returns ltr for technical field names', () => {
    for (const n of [
      'phone',
      'mobile',
      'whatsapp_number',
      'email_address',
      'website',
      'company_url',
      'business_slug',
      'product_code',
      'sku',
      'iban',
      'vat_number',
      'cr_number',
      'reference_no',
      'quote_number',
      'invoice_id',
      'tracking_code',
      'user_id',
    ]) {
      expect(resolveFieldDirection({ name: n }), `${n} should be ltr`).toBe('ltr');
    }
  });

  it('returns auto for free-form text fields', () => {
    for (const n of ['title', 'description', 'message', 'notes', 'project_details', 'comment']) {
      expect(resolveFieldDirection({ name: n }), `${n} should be auto`).toBe('auto');
    }
    expect(resolveFieldDirection({})).toBe('auto');
  });

  it('does not misclassify common false positives', () => {
    // contains "id" but not as a token
    expect(resolveFieldDirection({ name: 'midnight' })).toBe('auto');
    // contains "code" but not as a token
    expect(resolveFieldDirection({ name: 'encoder' })).toBe('auto');
  });
});