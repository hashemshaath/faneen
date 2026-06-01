import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock the hook BEFORE importing the component under test.
const useFeatureGateMock = vi.fn();
vi.mock('@/hooks/useFeatureGate', () => ({
  useFeatureGate: (...args: unknown[]) => useFeatureGateMock(...args),
}));
vi.mock('@/hooks/useDirection', () => ({
  useDirection: () => ({ isRTL: true, direction: 'rtl' }),
}));

// `useMembershipVisibility` was added to FeatureGate after this suite was written
// (membership governance phases). It internally calls `useVisibleModules` /
// `useActiveWorkspace`, both of which require a QueryClientProvider + Auth
// context that this suite intentionally does not set up. Membership visibility
// is covered by its own tests (membershipPageGovernanceRedesign1, etc.);
// here we only assert FeatureGate's gating behaviour, so we mock the hook with
// the "membership module visible" default state. A second mockReturnValue is
// installed in the "membership-hidden" describe block below.
const useMembershipVisibilityMock = vi.fn();
vi.mock('@/hooks/useMembershipVisibility', () => ({
  useMembershipVisibility: () => useMembershipVisibilityMock(),
}));

import { FeatureGate, RequireFeature } from '@/components/membership/FeatureGate';

const wrap = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

beforeEach(() => {
  useFeatureGateMock.mockReset();
  useMembershipVisibilityMock.mockReset();
  // Default: membership module is visible — preserves the original
  // assertion that the upgrade CTA links to "/membership".
  useMembershipVisibilityMock.mockReturnValue({
    isVisible: true,
    isLoading: false,
    shouldShowUpgradeCTA: true,
    membershipPathOrNull: '/membership',
    unavailableMessage: {
      ar: 'العضويات غير متاحة حالياً',
      en: 'Memberships are currently unavailable',
    },
  });
});

describe('FeatureGate — DB-driven plan visibility', () => {
  it('renders children when the plan allows the feature', () => {
    useFeatureGateMock.mockReturnValue({ allowed: true, isLoading: false });
    wrap(
      <FeatureGate feature="advanced_analytics">
        <span>secret-feature</span>
      </FeatureGate>,
    );
    expect(screen.getByText('secret-feature')).toBeInTheDocument();
  });

  it('hides children (mode="hide", default) when the plan does NOT include the feature', () => {
    useFeatureGateMock.mockReturnValue({ allowed: false, isLoading: false });
    wrap(
      <FeatureGate feature="advanced_analytics">
        <span>secret-feature</span>
      </FeatureGate>,
    );
    expect(screen.queryByText('secret-feature')).not.toBeInTheDocument();
  });

  it('renders an inline upgrade prompt with a link to /membership in mode="upgrade"', () => {
    useFeatureGateMock.mockReturnValue({ allowed: false, isLoading: false });
    wrap(
      <FeatureGate feature="advanced_analytics" mode="upgrade">
        <span>secret-feature</span>
      </FeatureGate>,
    );
    expect(screen.queryByText('secret-feature')).not.toBeInTheDocument();
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/membership');
  });

  it('keeps children mounted but inert in mode="disable" (used for read-only previews)', () => {
    useFeatureGateMock.mockReturnValue({ allowed: false, isLoading: false });
    wrap(
      <FeatureGate feature="advanced_analytics" mode="disable">
        <button>do-thing</button>
      </FeatureGate>,
    );
    const btn = screen.getByText('do-thing');
    expect(btn).toBeInTheDocument();
    const wrapper = btn.closest('[data-feature-locked]');
    expect(wrapper).not.toBeNull();
    expect(wrapper).toHaveAttribute('aria-disabled');
  });

  it('renders the explicit fallback when one is provided', () => {
    useFeatureGateMock.mockReturnValue({ allowed: false, isLoading: false });
    wrap(
      <FeatureGate
        feature="advanced_analytics"
        fallback={<span>fallback-node</span>}
      >
        <span>secret-feature</span>
      </FeatureGate>,
    );
    expect(screen.getByText('fallback-node')).toBeInTheDocument();
    expect(screen.queryByText('secret-feature')).not.toBeInTheDocument();
  });

  it('renders nothing while the gate is still loading from the DB', () => {
    useFeatureGateMock.mockReturnValue({ allowed: false, isLoading: true });
    const { container } = wrap(
      <FeatureGate feature="advanced_analytics">
        <span>secret-feature</span>
      </FeatureGate>,
    );
    expect(container.textContent).toBe('');
  });

  it('passes the businessId through so per-business plans are respected', () => {
    useFeatureGateMock.mockReturnValue({ allowed: true, isLoading: false });
    wrap(
      <FeatureGate feature="ai_assistant" businessId="BUS-1000001">
        <span>ok</span>
      </FeatureGate>,
    );
    expect(useFeatureGateMock).toHaveBeenCalledWith('ai_assistant', 'BUS-1000001');
  });
});

describe('RequireFeature — route-level gating', () => {
  it('renders the protected page when the plan grants access', () => {
    useFeatureGateMock.mockReturnValue({ allowed: true, isLoading: false });
    wrap(
      <RequireFeature feature="contracts">
        <h1>Contracts Page</h1>
      </RequireFeature>,
    );
    expect(screen.getByRole('heading', { name: 'Contracts Page' })).toBeInTheDocument();
  });

  it('blocks the route with an inline upgrade prompt when the plan is insufficient', () => {
    useFeatureGateMock.mockReturnValue({ allowed: false, isLoading: false });
    wrap(
      <RequireFeature feature="contracts">
        <h1>Contracts Page</h1>
      </RequireFeature>,
    );
    expect(screen.queryByRole('heading', { name: 'Contracts Page' })).not.toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/membership');
  });

  it('emits nothing while the plan check is still in flight (no flash of forbidden UI)', () => {
    useFeatureGateMock.mockReturnValue({ allowed: false, isLoading: true });
    const { container } = wrap(
      <RequireFeature feature="contracts">
        <h1>Contracts Page</h1>
      </RequireFeature>,
    );
    expect(container.textContent).toBe('');
  });
});

describe('FeatureGate — membership-visibility governance', () => {
  it('renders a contact-support link (not /membership) when the membership module is hidden', () => {
    useFeatureGateMock.mockReturnValue({ allowed: false, isLoading: false });
    useMembershipVisibilityMock.mockReturnValue({
      isVisible: false,
      isLoading: false,
      shouldShowUpgradeCTA: false,
      membershipPathOrNull: null,
      unavailableMessage: {
        ar: 'العضويات غير متاحة حالياً',
        en: 'Memberships are currently unavailable',
      },
    });
    wrap(
      <FeatureGate feature="advanced_analytics" mode="upgrade">
        <span>secret-feature</span>
      </FeatureGate>,
    );
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/contact');
    expect(link.getAttribute('href')).not.toBe('/membership');
  });
});