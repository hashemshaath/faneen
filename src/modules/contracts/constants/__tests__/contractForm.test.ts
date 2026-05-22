import { emptyForm } from '../contractForm';

describe('contractForm constants', () => {
  it('defaults currency_code to SAR', () => {
    expect(emptyForm.currency_code).toBe('SAR');
  });

  it('defaults vat_rate to 15', () => {
    expect(emptyForm.vat_rate).toBe('15');
  });

  it('defaults vat_inclusive to false', () => {
    expect(emptyForm.vat_inclusive).toBe(false);
  });

  it('defaults expected string fields to empty string', () => {
    expect(emptyForm.title_ar).toBe('');
    expect(emptyForm.title_en).toBe('');
    expect(emptyForm.description_ar).toBe('');
    expect(emptyForm.description_en).toBe('');
    expect(emptyForm.total_amount).toBe('');
    expect(emptyForm.start_date).toBe('');
    expect(emptyForm.end_date).toBe('');
    expect(emptyForm.terms_ar).toBe('');
    expect(emptyForm.terms_en).toBe('');
    expect(emptyForm.supervisor_name).toBe('');
    expect(emptyForm.supervisor_phone).toBe('');
    expect(emptyForm.supervisor_email).toBe('');
    expect(emptyForm.client_email).toBe('');
  });

  it('defaults optional IDs to empty string', () => {
    expect(emptyForm.total_amount).toBe('');
    expect(emptyForm.start_date).toBe('');
    expect(emptyForm.end_date).toBe('');
  });
});
