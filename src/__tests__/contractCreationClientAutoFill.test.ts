/**
 * CONTRACT CREATION CLIENT AUTO-FILL — source-level guards on
 * `src/pages/dashboard/DashboardContracts.tsx`.
 *
 * Locks in:
 *  - pure client accounts never see the ClientPicker search,
 *  - `selectedClient` is auto-filled from the signed-in user's profile,
 *  - a read-only self-client card is rendered instead,
 *  - no new client/business is created, no service_role, no `any`.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(
  resolve(__dirname, '../pages/dashboard/DashboardContracts.tsx'),
  'utf8',
);

describe('Contract creation — client auto-fill', () => {
  it('reads isProvider from useAuth to detect provider accounts', () => {
    expect(SRC).toMatch(/const\s*\{\s*user,\s*profile,\s*isAdmin,\s*isProvider\s*\}\s*=\s*useAuth\(\)/);
  });

  it('defines isClientOnlyAccount excluding admin/provider/owner accounts', () => {
    expect(SRC).toMatch(/const\s+isClientOnlyAccount\s*=/);
    expect(SRC).toMatch(/!isAdmin\s*&&\s*!isProvider\s*&&\s*businessId\s*===\s*null/);
  });

  it('auto-fills selectedClient from the signed-in profile (user.id, no search)', () => {
    expect(SRC).toMatch(/setSelectedClient\(\{\s*\n\s*user_id:\s*user\.id/);
    expect(SRC).toMatch(/source:\s*'self'/);
  });

  it('renders the self-client card and hides the ClientPicker for client accounts', () => {
    expect(SRC).toMatch(/data-testid="contract-create-self-client-card"/);
    // ClientPicker render is gated on !isClientOnlyAccount
    expect(SRC).toMatch(/!isClientOnlyAccount\s*&&\s*\(\s*\n\s*<ClientPicker/);
  });

  it('shows the "complete account/site data" hint when required fields are missing', () => {
    expect(SRC).toContain('أكمل بيانات الحساب أو الموقع قبل إنشاء العقد');
    expect(SRC).toContain('Complete your account or site details before creating the contract');
  });

  it('does not introduce service_role, `any`, ts-ignore, or hardcoded UUIDs in the new block', () => {
    const block = SRC.split('CONTRACT-CREATION-CLIENT-AUTO-FILL')[1]?.split('Phase 5B.4')[0] ?? '';
    expect(block).not.toMatch(/service_role/i);
    expect(block).not.toMatch(/:\s*any\b/);
    expect(block).not.toMatch(/\bas\s+any\b/);
    expect(block).not.toMatch(/@ts-ignore/);
    expect(block).not.toMatch(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
  });
});