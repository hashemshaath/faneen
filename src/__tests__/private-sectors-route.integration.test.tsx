/**
 * Integration test (jsdom) — verifies that the protected route
 *   /dashboard/private-sectors
 * does NOT fall through to the catch-all 404, and that it renders
 * <Forbidden /> when the current user is not a provider/admin.
 *
 * Mounts a router that mirrors App.tsx ordering (protected route then "*"),
 * and swaps the AuthContext via vi.mock with a mutable state object.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import React from 'react';

// ---------- Mutable auth state used by the AuthContext mock ----------
type AuthState = {
  user: { id: string } | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isProvider: boolean;
  profile: { is_onboarded: boolean; account_type: string | null } | null;
  roles: string[];
  signOut: () => Promise<void>;
};

const authState: AuthState = {
  user: null,
  loading: false,
  isAdmin: false,
  isSuperAdmin: false,
  isProvider: false,
  profile: null,
  roles: [],
  signOut: async () => {},
};

// ---------- Mocks for ProtectedRoute / Forbidden dependencies ----------
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({ insert: async () => ({ error: null }) }),
    auth: { signOut: async () => ({ error: null }) },
  },
}));

vi.mock('@/hooks/useNoIndex', () => ({ useNoIndex: () => {} }));
vi.mock('@/hooks/usePageMeta', () => ({ usePageMeta: () => {} }));
vi.mock('@/components/common/BrandLogo', () => ({
  BrandLogo: () => <div data-testid="brand-logo" />,
}));
vi.mock('@/i18n/LanguageContext', () => ({
  useLanguage: () => ({ isRTL: false, language: 'en' }),
}));
vi.mock('sonner', () => ({
  toast: { success: () => {}, error: () => {} },
}));

// Use the real forbiddenContext store (sessionStorage) — no mock needed.

// Import after mocks are registered.
import ProtectedRoute from '@/components/auth/ProtectedRoute';

const ChildSentinel = () => <div data-testid="protected-child">PRIVATE_SECTORS_OK</div>;
const NotFoundSentinel = () => <div data-testid="not-found">NOT_FOUND_404</div>;

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* Mirrors App.tsx — protected route declared BEFORE the catch-all */}
        <Route
          path="/dashboard/private-sectors"
          element={
            <ProtectedRoute requireProvider>
              <ChildSentinel />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFoundSentinel />} />
      </Routes>
    </MemoryRouter>,
  );

const setProvider = () => {
  authState.user = { id: 'user-provider' };
  authState.loading = false;
  authState.isAdmin = false;
  authState.isSuperAdmin = false;
  authState.isProvider = true;
  authState.profile = { is_onboarded: true, account_type: 'business' };
  authState.roles = ['user'];
};

const setRegularUser = () => {
  authState.user = { id: 'user-regular' };
  authState.loading = false;
  authState.isAdmin = false;
  authState.isSuperAdmin = false;
  authState.isProvider = false;
  authState.profile = { is_onboarded: true, account_type: 'individual' };
  authState.roles = ['user'];
};

beforeEach(() => {
  // reset to anon
  authState.user = null;
  authState.loading = false;
  authState.isAdmin = false;
  authState.isSuperAdmin = false;
  authState.isProvider = false;
  authState.profile = null;
  authState.roles = [];
  sessionStorage.clear();
});

describe('/dashboard/private-sectors — route resolution', () => {
  it('does NOT fall through to the catch-all 404 (provider sees the child)', async () => {
    setProvider();
    renderAt('/dashboard/private-sectors');
    await waitFor(() => {
      expect(screen.getByTestId('protected-child')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('not-found')).not.toBeInTheDocument();
  });

  it('renders <Forbidden /> (not 404) when the user is not a provider', async () => {
    setRegularUser();
    renderAt('/dashboard/private-sectors');

    // Forbidden is lazy-loaded — wait for the 403 marker to appear.
    await waitFor(
      () => {
        expect(screen.getByText('403')).toBeInTheDocument();
      },
      { timeout: 4000 },
    );

    // Must NOT have rendered the catch-all 404 page.
    expect(screen.queryByTestId('not-found')).not.toBeInTheDocument();
    // And must NOT have rendered the protected child.
    expect(screen.queryByTestId('protected-child')).not.toBeInTheDocument();

    // Forbidden should expose the requested path + required role for support copy.
    expect(screen.getByText('/dashboard/private-sectors')).toBeInTheDocument();
    expect(screen.getByText('provider')).toBeInTheDocument();
  });

  it('renders <Forbidden /> (not 404) when the user is admin-only with isProvider=false too — admin bypass works (positive control)', async () => {
    authState.user = { id: 'user-admin' };
    authState.isAdmin = true;
    authState.isProvider = false;
    authState.profile = { is_onboarded: true, account_type: 'admin' };
    authState.roles = ['admin'];

    renderAt('/dashboard/private-sectors');
    await waitFor(() => {
      expect(screen.getByTestId('protected-child')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('not-found')).not.toBeInTheDocument();
  });
});