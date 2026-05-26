import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ---- Mocks ---------------------------------------------------------------

const mockListOwner = vi.fn();
const mockListStaff = vi.fn();
const mockListLocations = vi.fn();
const mockUser = { id: 'user-1' };

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock('@/modules/businesses', () => ({
  listOwnerBusinesses: (...args: unknown[]) => mockListOwner(...args),
  listActiveStaffBusinessesForUser: (...args: unknown[]) => mockListStaff(...args),
}));

vi.mock('@/modules/locations', () => ({
  listLocationsForEntity: (...args: unknown[]) => mockListLocations(...args),
}));

import { useActiveWorkspace } from '@/hooks/useActiveWorkspace';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  mockListOwner.mockReset();
  mockListStaff.mockReset();
  mockListLocations.mockReset();
  mockListLocations.mockResolvedValue({ data: [], error: null });
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

  // ----- WORKSPACE-CONTEXT-2 -----

  it('hydrates permissions from staff permissions_override (object)', async () => {
    mockListOwner.mockResolvedValue({ data: [], error: null });
    mockListStaff.mockResolvedValue({
      data: [{
        id: 'ms-1', role: 'manager',
        permissions_override: { manage_contracts: true, view_only: false, manage_team: true },
        businesses: { id: 'b1', name_ar: null, name_en: 'A' },
      }],
      error: null,
    });

    const { result } = renderHook(() => useActiveWorkspace(), { wrapper });
    await waitFor(() => expect(result.current.active_entity_id).toBe('b1'));
    expect(result.current.permissions.sort()).toEqual(['manage_contracts', 'manage_team']);
  });

  it('hydrates permissions from staff permissions_override (array)', async () => {
    mockListOwner.mockResolvedValue({ data: [], error: null });
    mockListStaff.mockResolvedValue({
      data: [{
        id: 'ms-2', role: 'staff',
        permissions_override: ['view_dashboard', 'manage_quotes'],
        businesses: { id: 'b1', name_ar: null, name_en: 'A' },
      }],
      error: null,
    });

    const { result } = renderHook(() => useActiveWorkspace(), { wrapper });
    await waitFor(() => expect(result.current.permissions.length).toBe(2));
    expect(result.current.permissions).toContain('manage_quotes');
  });

  it('returns empty permissions for owner with no membership row', async () => {
    mockListOwner.mockResolvedValue({ data: [{ id: 'b1', name_ar: null, name_en: 'A' }], error: null });
    mockListStaff.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useActiveWorkspace(), { wrapper });
    await waitFor(() => expect(result.current.active_role).toBe('owner'));
    expect(result.current.permissions).toEqual([]);
  });

  it('restores active_location_id per (user, entity) from localStorage', async () => {
    localStorage.setItem('qitaat_active_location_user-1_b1', 'loc-2');
    mockListOwner.mockResolvedValue({ data: [{ id: 'b1', name_ar: null, name_en: 'A' }], error: null });
    mockListStaff.mockResolvedValue({ data: [], error: null });
    mockListLocations.mockResolvedValue({
      data: [{ id: 'loc-1', name_ar: null, name_en: 'Main', is_main: true, is_active: true },
             { id: 'loc-2', name_ar: null, name_en: 'Other', is_main: false, is_active: true }],
      error: null,
    });

    const { result } = renderHook(() => useActiveWorkspace(), { wrapper });
    await waitFor(() => expect(result.current.locations.length).toBe(2));
    await waitFor(() => expect(result.current.active_location_id).toBe('loc-2'));
  });

  it('resets active_location_id when persisted id is no longer accessible', async () => {
    localStorage.setItem('qitaat_active_location_user-1_b1', 'loc-ghost');
    mockListOwner.mockResolvedValue({ data: [{ id: 'b1', name_ar: null, name_en: 'A' }], error: null });
    mockListStaff.mockResolvedValue({ data: [], error: null });
    mockListLocations.mockResolvedValue({
      data: [{ id: 'loc-1', name_ar: null, name_en: 'Main', is_main: true, is_active: true }],
      error: null,
    });

    const { result } = renderHook(() => useActiveWorkspace(), { wrapper });
    await waitFor(() => expect(result.current.locations.length).toBe(1));
    await waitFor(() => expect(result.current.active_location_id).toBeNull());
    expect(localStorage.getItem('qitaat_active_location_user-1_b1')).toBeNull();
  });

  it('clears active_location_id when entity has no locations', async () => {
    localStorage.setItem('qitaat_active_location_user-1_b1', 'loc-1');
    mockListOwner.mockResolvedValue({ data: [{ id: 'b1', name_ar: null, name_en: 'A' }], error: null });
    mockListStaff.mockResolvedValue({ data: [], error: null });
    mockListLocations.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useActiveWorkspace(), { wrapper });
    await waitFor(() => expect(result.current.active_entity_id).toBe('b1'));
    await waitFor(() => expect(result.current.active_location_id).toBeNull());
  });

  it('setActiveLocationId rejects unknown ids (no localStorage trust)', async () => {
    mockListOwner.mockResolvedValue({ data: [{ id: 'b1', name_ar: null, name_en: 'A' }], error: null });
    mockListStaff.mockResolvedValue({ data: [], error: null });
    mockListLocations.mockResolvedValue({
      data: [{ id: 'loc-1', name_ar: null, name_en: 'Main', is_main: true, is_active: true }],
      error: null,
    });

    const { result } = renderHook(() => useActiveWorkspace(), { wrapper });
    await waitFor(() => expect(result.current.locations.length).toBe(1));

    act(() => result.current.setActiveLocationId('loc-spoof'));
    expect(result.current.active_location_id).toBeNull();

    act(() => result.current.setActiveLocationId('loc-1'));
    await waitFor(() => expect(result.current.active_location_id).toBe('loc-1'));

    act(() => result.current.clearActiveLocationId());
    await waitFor(() => expect(result.current.active_location_id).toBeNull());
  });

  it('resets location preference scope when active entity changes', async () => {
    localStorage.setItem('qitaat_active_location_user-1_b1', 'loc-1');
    localStorage.setItem('qitaat_active_location_user-1_b2', 'loc-2');
    mockListOwner.mockResolvedValue({ data: [{ id: 'b1', name_ar: null, name_en: 'A' }], error: null });
    mockListStaff.mockResolvedValue({
      data: [{ id: 'ms-9', role: 'staff', permissions_override: {}, businesses: { id: 'b2', name_ar: null, name_en: 'B' } }],
      error: null,
    });
    mockListLocations.mockImplementation(({ entityId }: { entityId: string }) =>
      Promise.resolve({
        data: entityId === 'b1'
          ? [{ id: 'loc-1', name_ar: null, name_en: 'A1', is_main: true, is_active: true }]
          : [{ id: 'loc-2', name_ar: null, name_en: 'B1', is_main: true, is_active: true }],
        error: null,
      }),
    );

    const { result } = renderHook(() => useActiveWorkspace(), { wrapper });
    await waitFor(() => expect(result.current.active_entity_id).toBe('b1'));
    await waitFor(() => expect(result.current.active_location_id).toBe('loc-1'));

    act(() => result.current.setActiveEntityId('b2'));
    await waitFor(() => expect(result.current.active_entity_id).toBe('b2'));
    await waitFor(() => expect(result.current.active_location_id).toBe('loc-2'));
  });
});
});
