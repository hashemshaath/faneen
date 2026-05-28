import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/i18n/LanguageContext', () => ({
  useLanguage: () => ({ isRTL: false, language: 'en' }),
}));

const isMobileMock = vi.fn(() => true);
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => isMobileMock(),
}));

vi.mock('@/hooks/useActiveWorkspace', () => ({
  useActiveWorkspace: () => ({
    active_entity_id: 'e',
    active_location_id: null,
    active_membership_id: 'm',
    active_role: 'owner',
    entities: [],
    locations: [],
    permissions: [],
    isLoading: false,
    setActiveEntityId: vi.fn(),
    setActiveLocationId: vi.fn(),
    clearActiveLocationId: vi.fn(),
  }),
}));

import { MobileWorkspaceActions } from '@/components/workspace/shell/MobileWorkspaceActions';
import { clearWorkspaceState } from '@/modules/workspace/state';

describe('APP-SHELL-2 — MobileWorkspaceActions', () => {
  beforeEach(() => { clearWorkspaceState(); });

  it('renders on mobile', () => {
    isMobileMock.mockReturnValue(true);
    render(<MemoryRouter><MobileWorkspaceActions /></MemoryRouter>);
    expect(screen.getByTestId('mobile-workspace-actions')).toBeInTheDocument();
  });

  it('hides on desktop', () => {
    isMobileMock.mockReturnValue(false);
    const { container } = render(<MemoryRouter><MobileWorkspaceActions /></MemoryRouter>);
    expect(container.querySelector('[data-testid="mobile-workspace-actions"]')).toBeNull();
  });
});