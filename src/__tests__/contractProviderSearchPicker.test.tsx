import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/modules/businesses/services/public/searchPublicProvidersByText', () => ({
  searchPublicProvidersByText: vi.fn(async ({ query }: { query: string }) => {
    if (!query || query.length < 2) return [];
    return [
      { id: 'b1', username: 'acme', ref_id: 'BIZ-0000001', name_ar: 'أكمي للمقاولات', name_en: 'Acme Contracting', logo_url: null, rating_avg: 4.7, rating_count: 12, is_verified: true },
      { id: 'b2', username: 'beta', ref_id: 'BIZ-0000002', name_ar: 'بيتا الهندسية', name_en: 'Beta Engineering', logo_url: null, rating_avg: 4.2, rating_count: 5, is_verified: false },
    ];
  }),
}));

import { ContractProviderSearchPicker, type SelectedProviderBusiness } from '@/components/contracts/dashboard/create/ContractProviderSearchPicker';

function renderPicker(props: Partial<React.ComponentProps<typeof ContractProviderSearchPicker>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onSelect = vi.fn();
  const utils = render(
    <QueryClientProvider client={qc}>
      <ContractProviderSearchPicker isRTL={true} selected={null} onSelect={onSelect} {...props} />
    </QueryClientProvider>,
  );
  return { ...utils, onSelect };
}

describe('ContractProviderSearchPicker', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the search input with the empty-state hint', () => {
    renderPicker();
    expect(screen.getByTestId('contract-provider-picker')).toBeTruthy();
    expect(screen.getByLabelText('بحث المزوّد')).toBeTruthy();
    expect(screen.getByText(/حرفين على الأقل/)).toBeTruthy();
  });

  it('debounces input and shows results after typing', async () => {
    const { onSelect } = renderPicker();
    const input = screen.getByLabelText('بحث المزوّد') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'أكمي' } });
    await waitFor(() => expect(screen.getByText('أكمي للمقاولات')).toBeTruthy(), { timeout: 1500 });
    fireEvent.click(screen.getByText('أكمي للمقاولات').closest('button')!);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'b1', ref_id: 'BIZ-0000001' }));
  });

  it('renders selected state with change button when a provider is selected', () => {
    const selected: SelectedProviderBusiness = {
      id: 'b1', name_ar: 'أكمي للمقاولات', name_en: 'Acme Contracting',
      ref_id: 'BIZ-0000001', username: 'acme', logo_url: null,
    };
    const { onSelect } = renderPicker({ selected });
    expect(screen.getByTestId('contract-provider-picker-selected')).toBeTruthy();
    expect(screen.getByText('أكمي للمقاولات')).toBeTruthy();
    fireEvent.click(screen.getByText('تغيير'));
    expect(onSelect).toHaveBeenCalledWith(null);
  });
});