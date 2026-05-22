import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LeadStatusBadge } from '../LeadStatusBadge';
import { LanguageProvider } from '@/i18n/LanguageContext';

const wrap = (status: string) =>
  render(
    <LanguageProvider>
      <LeadStatusBadge status={status} />
    </LanguageProvider>,
  );

describe('LeadStatusBadge', () => {
  it('renders a known status label', () => {
    wrap('accepted');
    expect(screen.getByText(/accepted|مقبول/i)).toBeInTheDocument();
  });

  it('falls back to raw status string when unknown', () => {
    wrap('mystery_status');
    expect(screen.getByText('mystery_status')).toBeInTheDocument();
  });
});