import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ---- Mocks ---------------------------------------------------------------

const mockListOwner = vi.fn();
const mockListStaff = vi.fn();
const mockUser = { id: 'user-1' };

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock('@/modules/businesses', () => ({
  listOwnerBusinesses: (...args: unknown[]) => mockListOwner(...args),
  listActiveStaffBusinessesForUser: (...args: unknown[]) => mockListStaff(...args),
}));

import { useActiveWorkspace } from '@/hooks/useActiveWorkspace';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  mockListOwner.mockReset();
  mockListStaff.mockReset();
  localStorage.clear();
});

describe('useActiveWorkspace', () => {
  it('exposes owned entity for owner-only user', async () => {
    mockListOwner.mockResolvedValue({ data: [{ id: 'b1', name_ar: 'أ', name_en: 'A' }], error: null });
    mockListStaff.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useActiveWorkspace(), { wrapper });
    await waitFor(() => expect(result.current.entities.length).toBe(1));

    expect(result.current.active_entity_id).toBe('b1');
    expect(result.current.active_role).toBe('owner');
    expect(result.current.active_membership_id).toBe('b1');
    expect(result.current.active_location_id).toBeNull();
    expect(result.current.permissions).toEqual([]);
  });

  it('exposes staff entity for staff-only user', async () => {
    mockListOwner.mockResolvedValue({ data: [], error: null });
    mockListStaff.mockResolvedValue({
      data: [{ id: 'ms-1', role: 'manager', businesses: { id: 'b2', name_ar: 'ب', name_en: 'B' } }],
      error: null,
    });

    const { result } = renderHook(() => useActiveWorkspace(), { wrapper });
    await waitFor(() => expect(result.current.entities.length).toBe(1));

    expect(result.current.active_entity_id).toBe('b2');
    expect(result.current.active_role).toBe('manager');
    expect(result.current.active_membership_id).toBe('ms-1');
    expect(result.current.entities[0].source).toBe('staff');
  });

  it('lets multi-entity user switch and persists preference', async () => {
    mockListOwner.mockResolvedValue({ data: [{ id: 'b1', name_ar: null, name_en: 'A' }], error: null });
    mockListStaff.mockResolvedValue({
      data: [{ id: 'ms-9', role: 'staff', businesses: { id: 'b2', name_ar: null, name_en: 'B' } }],
      error: null,
    });

    const { result } = renderHook(() => useActiveWorkspace(), { wrapper });
    await waitFor(() => expect(result.current.entities.length).toBe(2));
    expect(result.current.active_entity_id).toBe('b1');

    act(() => result.current.setActiveEntityId('b2'));
    await waitFor(() => expect(result.current.active_entity_id).toBe('b2'));
    expect(localStorage.getItem('qitaat_active_business_user-1')).toBe('b2');
  });

  it('restores localStorage preference on mount', async () => {
    localStorage.setItem('qitaat_active_business_user-1', 'b2');
    mockListOwner.mockResolvedValue({ data: [{ id: 'b1', name_ar: null, name_en: 'A' }], error: null });
    mockListStaff.mockResolvedValue({
      data: [{ id: 'ms-9', role: 'staff', businesses: { id: 'b2', name_ar: null, name_en: 'B' } }],
      error: null,
    });

    const { result } = renderHook(() => useActiveWorkspace(), { wrapper });
    await waitFor(() => expect(result.current.active_entity_id).toBe('b2'));
  });

  it('ignores inaccessible persisted entity and falls back to first accessible', async () => {
    localStorage.setItem('qitaat_active_business_user-1', 'b-ghost');
    mockListOwner.mockResolvedValue({ data: [{ id: 'b1', name_ar: null, name_en: 'A' }], error: null });
    mockListStaff.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useActiveWorkspace(), { wrapper });
    await waitFor(() => expect(result.current.active_entity_id).toBe('b1'));
    // self-heal rewrites storage
    expect(localStorage.getItem('qitaat_active_business_user-1')).toBe('b1');
  });

  it('uses only canonical wrappers (no direct table access)', async () => {
    mockListOwner.mockResolvedValue({ data: [], error: null });
    mockListStaff.mockResolvedValue({ data: [], error: null });

    renderHook(() => useActiveWorkspace(), { wrapper });
    await waitFor(() => {
      expect(mockListOwner).toHaveBeenCalled();
      expect(mockListStaff).toHaveBeenCalled();
    });
  });
});
