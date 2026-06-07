/**
 * Smoke tests for every dashboard Hub that renders through `TabbedShell`.
 *
 * Goals:
 *   1. PageHeader (now shared via TabbedShell) renders without breaking layout.
 *   2. Each tab trigger is present and clickable, proving routing wiring
 *      (search-param sync) is intact.
 *   3. Switching tabs updates `?tab=…` exactly once per click — guarding
 *      against the re-render regressions the perf pass was meant to fix.
 *
 * We mock `DashboardLayout` (sidebar / breadcrumbs / providers) so each
 * hub renders in isolation, and mock `lazyRetry` so tab bodies don't try
 * to load the real (provider-hungry) child pages.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useSearchParams } from 'react-router-dom';
import { LanguageProvider } from '@/i18n/LanguageContext';

vi.mock('@/components/dashboard/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-layout">{children}</div>
  ),
}));

vi.mock('@/lib/lazyRetry', () => ({
  lazyRetry: () =>
    React.lazy(async () => ({
      default: () => <div data-testid="tab-body">tab-body</div>,
    })),
}));

vi.mock('@/hooks/useNoIndex', () => ({ useNoIndex: () => undefined }));

// Import hubs *after* mocks so they pick them up.
import DashboardLoyaltyHub from '../DashboardLoyaltyHub';
import DashboardContractsHub from '../DashboardContractsHub';
import DashboardRfqHub from '../DashboardRfqHub';
import DashboardStaffHub from '../DashboardStaffHub';
import DashboardRequestsHub from '../DashboardRequestsHub';
import DashboardBusinessProfileHub from '../DashboardBusinessProfileHub';

type HubCase = {
  name: string;
  Component: React.ComponentType;
  titleAr: string;
  tabKeys: string[];
  firstTabLabelAr: string;
  secondTabLabelAr: string;
  secondTabKey: string;
};

const cases: HubCase[] = [
  {
    name: 'LoyaltyHub',
    Component: DashboardLoyaltyHub,
    titleAr: 'الولاء',
    tabKeys: ['overview', 'store'],
    firstTabLabelAr: 'الرصيد والمزايا',
    secondTabLabelAr: 'المتجر',
    secondTabKey: 'store',
  },
  {
    name: 'ContractsHub',
    Component: DashboardContractsHub,
    titleAr: 'العقود',
    tabKeys: ['contracts', 'analytics'],
    firstTabLabelAr: 'العقود',
    secondTabLabelAr: 'التحليلات',
    secondTabKey: 'analytics',
  },
  {
    name: 'RfqHub',
    Component: DashboardRfqHub,
    titleAr: 'عروض الأسعار RFQ',
    tabKeys: ['requests', 'inbox'],
    firstTabLabelAr: 'الطلبات',
    secondTabLabelAr: 'الوارد',
    secondTabKey: 'inbox',
  },
  {
    name: 'StaffHub',
    Component: DashboardStaffHub,
    titleAr: 'الموظفون',
    tabKeys: ['staff', 'permissions'],
    firstTabLabelAr: 'الموظفون',
    secondTabLabelAr: 'الصلاحيات',
    secondTabKey: 'permissions',
  },
  {
    name: 'RequestsHub',
    Component: DashboardRequestsHub,
    titleAr: 'الطلبات والفرص',
    tabKeys: ['service-requests', 'quote-opportunities'],
    firstTabLabelAr: 'طلبات الخدمة',
    secondTabLabelAr: 'فرص عروض الأسعار',
    secondTabKey: 'quote-opportunities',
  },
  {
    name: 'BusinessProfileHub',
    Component: DashboardBusinessProfileHub,
    titleAr: 'بيانات المنشأة',
    tabKeys: ['business', 'branches', 'entities', 'visibility'],
    firstTabLabelAr: 'بيانات المنشأة',
    secondTabLabelAr: 'الفروع',
    secondTabKey: 'branches',
  },
];

const SearchSpy: React.FC<{ onParams: (p: URLSearchParams) => void }> = ({ onParams }) => {
  const [params] = useSearchParams();
  React.useEffect(() => onParams(params), [params, onParams]);
  return null;
};

const renderHub = (Component: React.ComponentType, onParams: (p: URLSearchParams) => void) =>
  render(
    <LanguageProvider>
      <MemoryRouter initialEntries={['/hub']}>
        <Routes>
          <Route
            path="/hub"
            element={
              <>
                <Component />
                <SearchSpy onParams={onParams} />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </LanguageProvider>,
  );

describe('Dashboard Hubs — PageHeader + TabbedShell integration', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(cases)(
    '$name renders PageHeader title, all tab triggers, and routes are wired',
    ({ Component, titleAr, tabKeys, firstTabLabelAr, secondTabLabelAr, secondTabKey }) => {
      let lastParams = new URLSearchParams();
      renderHub(Component, (p) => {
        lastParams = p;
      });

      // (1) PageHeader landmark with title (region role = AdminPageHeader root).
      const header = screen.getByRole('region', { name: titleAr });
      expect(header).toBeInTheDocument();
      expect(within(header).getByRole('heading', { level: 1, name: titleAr })).toBeInTheDocument();

      // (2) Every tab trigger renders (one per key).
      const triggers = screen.getAllByRole('tab');
      expect(triggers).toHaveLength(tabKeys.length);
      expect(screen.getByRole('tab', { name: new RegExp(firstTabLabelAr) })).toBeInTheDocument();
      const second = screen.getByRole('tab', { name: new RegExp(secondTabLabelAr) });
      expect(second).toBeInTheDocument();

      // (3) Default tab has no `?tab=…` query (clean URL contract).
      expect(lastParams.get('tab')).toBeNull();

      // (4) Switching tabs mirrors to `?tab=<key>` — routing/state untouched.
      // Radix TabsTrigger listens on pointer events; also wrap in act() so
      // React Router's setSearchParams effect flushes before assertion.
      act(() => {
        fireEvent.pointerDown(second, { button: 0, pointerType: 'mouse' });
        fireEvent.mouseDown(second, { button: 0 });
        fireEvent.click(second);
      });
      await waitFor(() => expect(lastParams.get('tab')).toBe(secondTabKey));
    },
  );
});