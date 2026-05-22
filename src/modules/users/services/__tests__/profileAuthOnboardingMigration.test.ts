import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Builder = {
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  then: (fn: (v: unknown) => unknown) => Promise<unknown>;
};

function makeBuilder(result: { data: unknown; error: unknown }): Builder {
  const b: Record<string, unknown> = {};
  const chain = () => b as unknown as Builder;
  b.insert = vi.fn(chain);
  b.update = vi.fn(chain);
  b.select = vi.fn(chain);
  b.eq = vi.fn(chain);
  b.is = vi.fn(chain);
  b.maybeSingle = vi.fn(() => Promise.resolve(result));
  b.then = (onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled);
  return b as unknown as Builder;
}

let builder: Builder;
const fromMock = vi.fn((_t: string) => builder);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => fromMock(t) },
}));

import { insertProfile } from '../insertProfile';
import { updateOnboardingProgress } from '../updateOnboardingProgress';

beforeEach(() => {
  fromMock.mockClear();
  builder = makeBuilder({ data: null, error: null });
});

describe('insertProfile', () => {
  it("from('profiles').insert(payload) passes payload unchanged", async () => {
    const payload = { user_id: 'u1', full_name: 'A', email: 'a@b.c' } as never;
    await insertProfile({ payload });
    expect(fromMock).toHaveBeenCalledWith('profiles');
    expect(builder.insert).toHaveBeenCalledWith(payload);
  });
  it('passes through { data, error }', async () => {
    builder = makeBuilder({ data: null, error: { message: 'dup' } });
    const r = await insertProfile({ payload: { user_id: 'u' } as never });
    expect(r).toEqual({ data: null, error: { message: 'dup' } });
  });
});

describe('updateOnboardingProgress', () => {
  it("update(values).eq('user_id').is('onboarding_completed_at', null)", async () => {
    await updateOnboardingProgress({
      userId: 'u1',
      values: { onboarding_step: 2, onboarding_started_at: '2026-01-01T00:00:00Z' },
    });
    expect(fromMock).toHaveBeenCalledWith('profiles');
    expect(builder.update).toHaveBeenCalledWith({
      onboarding_step: 2,
      onboarding_started_at: '2026-01-01T00:00:00Z',
    });
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(builder.is).toHaveBeenCalledWith('onboarding_completed_at', null);
  });
  it('passes through error shape', async () => {
    builder = makeBuilder({ data: null, error: { message: 'rls' } });
    const r = await updateOnboardingProgress({ userId: 'u', values: { onboarding_step: 0 } });
    expect(r).toEqual({ data: null, error: { message: 'rls' } });
  });
});

// ─── Migration regression locks ────────────────────────────
const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf-8');

describe('P-8 migration: authService.updateProfile', () => {
  const src = read('src/services/auth/authService.ts');
  it('no longer contains direct supabase.from("profiles") calls', () => {
    expect(src).not.toMatch(/supabase\.from\(['"]profiles['"]\)/);
  });
  it('imports updateProfile from @/modules/users', () => {
    expect(src).toMatch(/from '@\/modules\/users'/);
    expect(src).toMatch(/updateProfile/);
  });
  it('still throws on profile update error (behavior preserved)', () => {
    expect(src).toMatch(/if \(error\) throw error/);
  });
});

describe('P-8 migration: Onboarding.tsx', () => {
  const src = read('src/pages/Onboarding.tsx');
  it('no longer contains direct supabase.from("profiles") calls', () => {
    expect(src).not.toMatch(/supabase\.from\(['"]profiles['"]\)/);
  });
  it('imports updateOnboardingProgress from @/modules/users', () => {
    expect(src).toMatch(/updateOnboardingProgress/);
    expect(src).toMatch(/from '@\/modules\/users'/);
  });
});

describe('P-8 migration: onboarding-draft.ts', () => {
  const src = read('src/lib/onboarding-draft.ts');
  it('no longer contains direct supabase.from("profiles") calls', () => {
    expect(src).not.toMatch(/supabase\.from\(['"]profiles['"]\)/);
  });
  it('uses updateProfile + getProfileByUserId from @/modules/users', () => {
    expect(src).toMatch(/updateProfile/);
    expect(src).toMatch(/getProfileByUserId/);
    expect(src).toMatch(/from '@\/modules\/users'/);
  });
  it('preserves swallow-on-failure remote sync (try/catch with empty handler)', () => {
    expect(src).toMatch(/local copy is the source of truth/);
  });
});