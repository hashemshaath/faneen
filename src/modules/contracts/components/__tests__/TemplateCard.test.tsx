import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TemplateCard } from '../TemplateCard';
import type { ContractTemplateGalleryItem } from '@/modules/contracts/types/templates';

const base: ContractTemplateGalleryItem = {
  id: 't-1',
  category: 'aluminum_doors_windows',
  name_ar: 'قالب ألمنيوم',
  name_en: 'Aluminum Template',
  scope_of_work_ar: null,
  warranty_terms_ar: null,
  payment_terms_ar: null,
};

describe('TemplateCard', () => {
  it('renders Arabic title + Arabic category label when isRTL=true', () => {
    render(<TemplateCard template={base} isRTL onSelect={() => {}} />);
    expect(screen.getByText('قالب ألمنيوم')).toBeInTheDocument();
    expect(screen.getByText('ألمنيوم أبواب وشبابيك')).toBeInTheDocument();
  });

  it('renders English title when isRTL=false', () => {
    render(<TemplateCard template={base} isRTL={false} onSelect={() => {}} />);
    expect(screen.getByText('Aluminum Template')).toBeInTheDocument();
    expect(screen.getByText('Aluminum Doors & Windows')).toBeInTheDocument();
  });

  it('falls back to name_ar when name_en is null and isRTL=false', () => {
    render(<TemplateCard template={{ ...base, name_en: null }} isRTL={false} onSelect={() => {}} />);
    expect(screen.getByText('قالب ألمنيوم')).toBeInTheDocument();
  });

  it('falls back to raw category key when config missing', () => {
    render(
      <TemplateCard
        template={{ ...base, category: 'unknown_cat' }}
        isRTL={false}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText('unknown_cat')).toBeInTheDocument();
  });

  it('renders only badges whose corresponding *_ar field is truthy', () => {
    const { rerender } = render(
      <TemplateCard
        template={{ ...base, scope_of_work_ar: 'x', payment_terms_ar: 'y' }}
        isRTL={false}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText('Scope')).toBeInTheDocument();
    expect(screen.getByText('Payment')).toBeInTheDocument();
    expect(screen.queryByText('Warranty')).toBeNull();

    rerender(
      <TemplateCard
        template={{ ...base, warranty_terms_ar: 'w' }}
        isRTL
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText('ضمان')).toBeInTheDocument();
    expect(screen.queryByText('نطاق')).toBeNull();
    expect(screen.queryByText('دفع')).toBeNull();
  });

  it('calls onSelect(template) when clicked', () => {
    const onSelect = vi.fn();
    render(<TemplateCard template={base} isRTL={false} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Aluminum Template'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(base);
  });
});