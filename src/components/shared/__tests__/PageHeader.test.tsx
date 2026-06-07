import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { Award } from 'lucide-react';
import { PageHeader } from '@/components/shared';
import { LanguageProvider } from '@/i18n/LanguageContext';

const wrap = (ui: React.ReactNode) => <LanguageProvider>{ui}</LanguageProvider>;

describe('PageHeader (shared)', () => {
  it('renders title, subtitle, icon and actions without breaking layout', () => {
    render(
      wrap(<PageHeader
        icon={Award}
        title="Loyalty"
        subtitle="Points and rewards"
        eyebrow="Dashboard"
        actions={<button type="button">Add</button>}
      />),
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Loyalty' })).toBeInTheDocument();
    expect(screen.getByText('Points and rewards')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
    // section landmark labelled by title for a11y
    expect(screen.getByRole('region', { name: 'Loyalty' })).toBeInTheDocument();
  });

  it('does not interfere with routing when embedded in a route', () => {
    render(
      wrap(<MemoryRouter initialEntries={['/x']}>
        <Routes>
          <Route
            path="/x"
            element={
              <>
                <PageHeader icon={Award} title="X page" />
                <Link to="/y">go-y</Link>
              </>
            }
          />
          <Route path="/y" element={<div>Y page</div>} />
        </Routes>
      </MemoryRouter>),
    );
    expect(screen.getByRole('heading', { name: 'X page' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'go-y' })).toHaveAttribute('href', '/y');
  });

  it('is memoized — same props do not trigger a re-render of the header subtree', () => {
    let renders = 0;
    const Probe = () => {
      renders += 1;
      return <span data-testid="probe">{renders}</span>;
    };
    // Hoisted children & actions ⇒ stable references across re-renders.
    const stableActions = <Probe />;
    const Page = ({ n }: { n: number }) => (
      <>
        <PageHeader icon={Award} title="Stable" actions={stableActions} />
        <span data-testid="external">{n}</span>
      </>
    );
    const { rerender } = render(wrap(<Page n={1} />));
    expect(renders).toBe(1);
    // Parent re-renders with the same PageHeader props ⇒ React.memo keeps
    // the header subtree (including <Probe />) from re-running.
    rerender(wrap(<Page n={2} />));
    expect(screen.getByTestId('external').textContent).toBe('2');
    expect(renders).toBe(1);
  });
});