import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Tabs } from '@/components/ui/tabs';
import { ContractTabsHeader } from '../ContractTabsHeader';
import { LanguageProvider } from '@/i18n/LanguageContext';

const fullCounts = {
  milestones: 3,
  measurements: 5,
  warranty: 2,
  maintenance: 1,
  notes: 7,
  attachments: 4,
  amendments: 6,
  counterOffers: 11,
  versions: 12,
  history: 13,
  exports: 8,
  pdfAnalysis: 9,
};

function renderWithTabs(ui: React.ReactNode) {
  return render(
    <LanguageProvider>
      <Tabs defaultValue="milestones">{ui}</Tabs>
    </LanguageProvider>,
  );
}

describe('ContractTabsHeader', () => {
  it('renders 12 tabs in the expected order', () => {
    renderWithTabs(<ContractTabsHeader isRTL={false} counts={fullCounts} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(12);
    expect(tabs.map((t) => t.getAttribute('data-state') ? t.textContent?.trim() : null)).toEqual([
      'Milestones (3)',
      'Measurements (5)',
      'Warranty (2)',
      'Maintenance (1)',
      'Notes (7)',
      'Attachments (4)',
      'Amendments (6)',
      'Counter Offers (11)',
      'Version Diff (12)',
      'Full History (13)',
      'Export History (8)',
      'Analysis Log (9)',
    ]);
  });

  it('renders English labels when isRTL=false', () => {
    renderWithTabs(<ContractTabsHeader isRTL={false} counts={fullCounts} />);
    expect(screen.getByText(/Milestones \(3\)/)).toBeInTheDocument();
    expect(screen.getByText(/Measurements \(5\)/)).toBeInTheDocument();
    expect(screen.getByText(/Warranty \(2\)/)).toBeInTheDocument();
    expect(screen.getByText(/Maintenance \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Notes \(7\)/)).toBeInTheDocument();
    expect(screen.getByText(/Attachments \(4\)/)).toBeInTheDocument();
    expect(screen.getByText(/Amendments \(6\)/)).toBeInTheDocument();
    expect(screen.getByText(/Counter Offers \(11\)/)).toBeInTheDocument();
    expect(screen.getByText(/Version Diff \(12\)/)).toBeInTheDocument();
    expect(screen.getByText(/Full History \(13\)/)).toBeInTheDocument();
    expect(screen.getByText(/Export History \(8\)/)).toBeInTheDocument();
    expect(screen.getByText(/Analysis Log \(9\)/)).toBeInTheDocument();
  });

  it('renders Arabic labels when isRTL=true', () => {
    renderWithTabs(<ContractTabsHeader isRTL={true} counts={fullCounts} />);
    expect(screen.getByText(/المراحل/)).toBeInTheDocument();
    expect(screen.getByText(/المقاسات/)).toBeInTheDocument();
    expect(screen.getByText(/الضمان/)).toBeInTheDocument();
    expect(screen.getByText(/الصيانة/)).toBeInTheDocument();
    expect(screen.getByText(/الملاحظات/)).toBeInTheDocument();
    expect(screen.getByText(/المرفقات/)).toBeInTheDocument();
    expect(screen.getByText(/الملاحق/)).toBeInTheDocument();
    expect(screen.getByText(/المفاوضات/)).toBeInTheDocument();
    expect(screen.getByText(/مقارنة الإصدارات/)).toBeInTheDocument();
    expect(screen.getByText(/السجل الكامل/)).toBeInTheDocument();
    expect(screen.getByText(/سجل التصدير/)).toBeInTheDocument();
    expect(screen.getByText(/تحليل التصدير/)).toBeInTheDocument();
  });

  it('defaults exports and pdfAnalysis to 0 when omitted', () => {
    renderWithTabs(
      <ContractTabsHeader
        isRTL={false}
        counts={{
          milestones: 0,
          measurements: 0,
          warranty: 0,
          maintenance: 0,
          notes: 0,
          attachments: 0,
          amendments: 0,
        }}
      />
    );
    expect(screen.getByText(/Export History \(0\)/)).toBeInTheDocument();
    expect(screen.getByText(/Analysis Log \(0\)/)).toBeInTheDocument();
  });
});