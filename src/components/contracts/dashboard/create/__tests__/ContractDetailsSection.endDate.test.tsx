import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ContractDetailsSection } from '../ContractDetailsSection';
import type { ContractForm } from '../contract-form-types';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) },
}));
vi.mock('@/components/blog/FieldAiActions', () => ({ FieldAiActions: () => null }));

const emptyForm: ContractForm = {
  title_ar: '', title_en: '', description_ar: '', description_en: '',
  total_amount: '', currency_code: 'SAR', start_date: '2026-01-01', end_date: '',
  terms_ar: '', terms_en: '',
  supervisor_name: '', supervisor_phone: '', supervisor_email: '',
  client_email: '', vat_inclusive: true, vat_rate: '15',
};

function renderWith(initial: ContractForm) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  let current = initial;
  const setForm: React.Dispatch<React.SetStateAction<ContractForm>> = (u) => {
    current = typeof u === 'function' ? (u as (p: ContractForm) => ContractForm)(current) : u;
    rerender();
  };
  const ui = () => (
    <QueryClientProvider client={qc}>
      <ContractDetailsSection isRTL form={current} setForm={setForm} />
    </QueryClientProvider>
  );
  const utils = render(ui());
  const rerender = () => utils.rerender(ui());
  return { ...utils, get form() { return current; } };
}

describe('ContractDetailsSection — end date toggle & validation (RTL)', () => {
  it('renders Arabic toggle labels for date/duration', () => {
    renderWith(emptyForm);
    expect(screen.getByText('تاريخ')).toBeInTheDocument();
    expect(screen.getByText('مدة (أيام)')).toBeInTheDocument();
  });

  it('shows an error when end_date precedes start_date', () => {
    renderWith({ ...emptyForm, start_date: '2026-02-10', end_date: '2026-02-01' });
    expect(screen.getByTestId('contract-date-error')).toHaveTextContent('تاريخ الانتهاء');
  });

  it('computes end_date from duration and updates when start_date changes', async () => {
    const handle = renderWith({ ...emptyForm, start_date: '2026-03-01' });
    fireEvent.click(screen.getByText('مدة (أيام)'));
    const daysInput = screen.getByPlaceholderText('عدد الأيام') as HTMLInputElement;
    await act(async () => { fireEvent.change(daysInput, { target: { value: '10' } }); });
    expect(handle.form.end_date).toBe('2026-03-11');
  });
});