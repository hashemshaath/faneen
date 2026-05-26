import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import React, { useState } from 'react';
import { UsernamePicker } from '../UsernamePicker';
import { FIELD_DEBOUNCE_MS } from '@/hooks/useDebouncedValue';

// Mock the supabase client used by the picker.
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

import { supabase } from '@/integrations/supabase/client';

const Controlled = (props: { initial?: string; serverError?: React.ComponentProps<typeof UsernamePicker>['serverError'] }) => {
  const [v, setV] = useState(props.initial ?? '');
  return (
    <UsernamePicker
      value={v}
      onChange={setV}
      serverError={props.serverError ?? null}
      isRTL={false}
    />
  );
};

describe('UsernamePicker — status message above the field', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (supabase.rpc as ReturnType<typeof vi.fn>).mockReset();
  });

  it('shows "Checking" then "Available" after debounce when RPC returns available', async () => {
    (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { available: true }, error: null });
    render(<Controlled />);
    const input = screen.getByPlaceholderText('my-handle') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'ahmed_m' } });
    // Before debounce, status is "Checking…"
    expect(screen.getByText(/Checking/i)).toBeInTheDocument();
    // After 450ms debounce + microtask flush, "Available" appears.
    await act(async () => { vi.advanceTimersByTime(FIELD_DEBOUNCE_MS + 20); });
    await act(async () => { await Promise.resolve(); });
    expect(await screen.findByText(/Available/i)).toBeInTheDocument();
  });

  it('shows raw token `taken` inline when serverError forces username_unavailable', async () => {
    render(
      <Controlled
        initial="taken_name"
        serverError={{ forValue: 'taken_name', reason: 'taken', rawCode: 'username_unavailable: taken' }}
      />,
    );
    const err = await screen.findByTestId('username-status-error');
    expect(err.textContent).toMatch(/already taken/i);
    expect(err.textContent).toMatch(/username_unavailable: taken/);
    // Suggestions block must be visible and non-empty.
    expect(screen.getByText(/Try:/i)).toBeInTheDocument();
  });

  it('keeps suggestions visible on retry until value changes', async () => {
    const { rerender } = render(
      <UsernamePicker
        value="taken_name"
        onChange={() => {}}
        serverError={{ forValue: 'taken_name', reason: 'taken', rawCode: 'taken' }}
        isRTL={false}
      />,
    );
    expect(await screen.findByText(/Try:/i)).toBeInTheDocument();
    // Simulate a retry with the same forced error — suggestions still there.
    rerender(
      <UsernamePicker
        value="taken_name"
        onChange={() => {}}
        serverError={{ forValue: 'taken_name', reason: 'taken', rawCode: 'taken' }}
        isRTL={false}
      />,
    );
    expect(screen.getByText(/Try:/i)).toBeInTheDocument();
  });
});

describe('parseProfileSaveError', () => {
  it('extracts field + code from `username_unavailable: taken`', async () => {
    const { parseProfileSaveError } = await import('@/pages/admin/AdminUsers');
    const r = parseProfileSaveError('username_unavailable: taken', false);
    expect(r.field).toBe('username');
    expect(r.reason).toBe('taken');
    expect(r.rawCode).toContain('username_unavailable: taken');
    expect(r.friendly).toMatch(/already taken/i);
  });

  it('extracts `invalid_format` reason', async () => {
    const { parseProfileSaveError } = await import('@/pages/admin/AdminUsers');
    const r = parseProfileSaveError('username_unavailable: invalid_format', false);
    expect(r.reason).toBe('invalid_format');
  });

  it('falls back to field detection for plain text errors', async () => {
    const { parseProfileSaveError } = await import('@/pages/admin/AdminUsers');
    expect(parseProfileSaveError('email already exists', false).field).toBe('email');
    expect(parseProfileSaveError('phone number malformed', false).field).toBe('phone');
  });
});