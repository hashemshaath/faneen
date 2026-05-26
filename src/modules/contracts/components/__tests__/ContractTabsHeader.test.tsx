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
  it('renders 9 tabs', () => {
    renderWithTabs(<ContractTabsHeader isRTL={false} counts={fullCounts} />);
    expect(screen.getAllByRole('tab')).toHaveLength(9);
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