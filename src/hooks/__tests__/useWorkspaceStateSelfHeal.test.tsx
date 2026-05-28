/**
 * CRITICAL-ENTITY-IDENTITY-ACCESS-FIX-1 Phase 1 — self-heal tests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockListOwner = vi.fn();
const mockListStaff = vi.fn();
const mockListLocations = vi.fn();
const mockUser = { id: 'user-99' };

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));
vi.mock('@/modules/businesses', () => ({
  listOwnerBusinesses: (...a: unknown[]) => mockListOwner(...a),
  listActiveStaffBusinessesForUser: (...a: unknown[]) => mockListStaff(...a),
}));
vi.mock('@/modules/locations', () => ({
  listLocationsForEntity: (...a: unknown[]) => mockListLocations(...a),
}));

import { useWorkspaceStateSelfHeal } from '@/hooks/useWorkspaceStateSelfHeal';
import { readWorkspaceState, clearWorkspaceState, setActiveEntity, WORKSPACE_STATE_STORAGE_KEY } from '@/modules/workspace/state';

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
  clearWorkspaceState();
});

describe('useWorkspaceStateSelfHeal', () => {
  it('clears a stale persisted active_entity_id and falls back to first accessible', async () => {
    // Seed store with a stale id
    setActiveEntity('stale-entity-id');
    expect(readWorkspaceState().active_entity_id).toBe('stale-entity-id');

    mockListOwner.mockResolvedValue({ data: [{ id: 'b1', name_ar: null, name_en: 'A' }], error: null });
    mockListStaff.mockResolvedValue({ data: [], error: null });

    renderHook(() => useWorkspaceStateSelfHeal(), { wrapper });

    await waitFor(() => {
      expect(readWorkspaceState().active_entity_id).toBe('b1');
    });
  });

  it('clears persisted id to null when user has zero accessible entities', async () => {
    setActiveEntity('stale-entity-id');
    mockListOwner.mockResolvedValue({ data: [], error: null });
    mockListStaff.mockResolvedValue({ data: [], error: null });

    renderHook(() => useWorkspaceStateSelfHeal(), { wrapper });

    await waitFor(() => {
      expect(readWorkspaceState().active_entity_id).toBeNull();
    });
  });

  it('mirrors useActiveBusiness selection into the store when store is empty', async () => {
    // No persisted store; useActiveBusiness will pick b1 from its own key
    mockListOwner.mockResolvedValue({ data: [{ id: 'b1', name_ar: null, name_en: 'A' }], error: null });
    mockListStaff.mockResolvedValue({ data: [], error: null });

    renderHook(() => useWorkspaceStateSelfHeal(), { wrapper });

    await waitFor(() => {
      expect(readWorkspaceState().active_entity_id).toBe('b1');
    });
  });

  it('does not loop: a single repair persists across re-renders', async () => {
    setActiveEntity('ghost');
    mockListOwner.mockResolvedValue({ data: [{ id: 'b1', name_ar: null, name_en: 'A' }], error: null });
    mockListStaff.mockResolvedValue({ data: [], error: null });

    const { rerender } = renderHook(() => useWorkspaceStateSelfHeal(), { wrapper });
    await waitFor(() => expect(readWorkspaceState().active_entity_id).toBe('b1'));

    // Force another render — state should remain b1, never flip back.
    rerender();
    await new Promise((r) => setTimeout(r, 10));
    expect(readWorkspaceState().active_entity_id).toBe('b1');
  });

  it('leaves valid persisted id untouched', async () => {
    mockListOwner.mockResolvedValue({
      data: [
        { id: 'b1', name_ar: null, name_en: 'A' },
        { id: 'b2', name_ar: null, name_en: 'B' },
      ],
      error: null,
    });
    mockListStaff.mockResolvedValue({ data: [], error: null });
    setActiveEntity('b2');

    renderHook(() => useWorkspaceStateSelfHeal(), { wrapper });
    await new Promise((r) => setTimeout(r, 30));
    expect(readWorkspaceState().active_entity_id).toBe('b2');
    expect(WORKSPACE_STATE_STORAGE_KEY).toBeTruthy();
  });
});