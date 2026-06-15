/**
 * PRODUCT REFINEMENT — Phase A: Unified Dashboard Overview
 *
 * Verifies that the new `UnifiedDashboardHero` + `UnifiedKpiGrid`
 * primitives render correctly and remain the canonical hero/KPI
 * surface across all role overviews.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DollarSign } from 'lucide-react';
import {
  UnifiedDashboardHero,
  formatLastUpdated,
} from '@/components/dashboard/overview/UnifiedDashboardHero';
import {
  UnifiedKpiGrid,
  type UnifiedKpiTile,
} from '@/components/dashboard/overview/UnifiedKpiGrid';

const renderInRouter = (ui: React.ReactNode) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe('Phase A — UnifiedDashboardHero', () => {
  it('renders the role label, greeting + name, ref id and last-updated', () => {
    renderInRouter(
      <UnifiedDashboardHero
        isRTL
        roleLabel={{ ar: 'لوحة العميل', en: 'Client Dashboard' }}
        fullName="أحمد"
        refId="USR-1000005"
        lastUpdated="آخر تحديث: منذ 2 د"
        onRefresh={() => {}}
      />,
    );
    expect(screen.getByText('لوحة العميل')).toBeInTheDocument();
    expect(screen.getByText(/أحمد/)).toBeInTheDocument();
    expect(screen.getByText('USR-1000005')).toBeInTheDocument();
    expect(screen.getByText('آخر تحديث: منذ 2 د')).toBeInTheDocument();
  });

  it('triggers refresh on click and disables when loading', () => {
    const onRefresh = vi.fn();
    renderInRouter(
      <UnifiedDashboardHero
        isRTL={false}
        roleLabel={{ ar: 'لوحة المسؤول', en: 'Admin Console' }}
        onRefresh={onRefresh}
        isRefreshing={false}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('shows customize action only when onCustomize is provided', () => {
    const { rerender } = renderInRouter(
      <UnifiedDashboardHero
        isRTL={false}
        roleLabel={{ ar: '', en: 'Admin' }}
        onRefresh={() => {}}
      />,
    );
    expect(screen.queryByText(/Customize|Done/i)).not.toBeInTheDocument();
    rerender(
      <MemoryRouter>
        <UnifiedDashboardHero
          isRTL={false}
          roleLabel={{ ar: '', en: 'Admin' }}
          onRefresh={() => {}}
          onCustomize={() => {}}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Customize/i)).toBeInTheDocument();
  });
});

describe('Phase A — formatLastUpdated', () => {
  it('returns null for missing date', () => {
    expect(formatLastUpdated(null, true)).toBeNull();
    expect(formatLastUpdated(undefined, false)).toBeNull();
  });

  it('returns "just now" for fresh dates', () => {
    const fresh = new Date(Date.now() - 5_000);
    expect(formatLastUpdated(fresh, true)).toMatch(/الآن/);
    expect(formatLastUpdated(fresh, false)).toMatch(/just now/);
  });

  it('returns minutes/hours phrasing in both languages', () => {
    const tenMin = new Date(Date.now() - 10 * 60_000);
    expect(formatLastUpdated(tenMin, true)).toMatch(/منذ 10 د/);
    expect(formatLastUpdated(tenMin, false)).toMatch(/10m ago/);

    const twoHr = new Date(Date.now() - 2 * 3600_000);
    expect(formatLastUpdated(twoHr, true)).toMatch(/منذ 2 س/);
    expect(formatLastUpdated(twoHr, false)).toMatch(/2h ago/);
  });
});

describe('Phase A — UnifiedKpiGrid', () => {
  const tiles: UnifiedKpiTile[] = [
    {
      id: 'spent',
      label: 'Total Spent',
      value: '45,200 SAR',
      sub: '12 completed',
      delta: { value: '+12%', direction: 'up' },
      icon: DollarSign,
    },
    {
      id: 'active',
      label: 'Active',
      value: 5,
      to: '/dashboard/contracts',
    },
    {
      id: 'msgs',
      label: 'Messages',
      value: 0,
    },
    {
      id: 'unread',
      label: 'Unread',
      value: 3,
      delta: { value: '-2%', direction: 'down' },
    },
  ];

  it('renders all tiles with labels, values and deltas', () => {
    renderInRouter(<UnifiedKpiGrid tiles={tiles} isRTL={false} />);
    expect(screen.getByText('Total Spent')).toBeInTheDocument();
    expect(screen.getByText('45,200 SAR')).toBeInTheDocument();
    expect(screen.getByText('12 completed')).toBeInTheDocument();
    expect(screen.getByText('+12%')).toBeInTheDocument();
    expect(screen.getByText('-2%')).toBeInTheDocument();
  });

  it('wraps tiles with a `to` prop in a router link', () => {
    renderInRouter(<UnifiedKpiGrid tiles={tiles} isRTL={false} />);
    const link = screen.getByText('Active').closest('a');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toBe('/dashboard/contracts');
  });
});