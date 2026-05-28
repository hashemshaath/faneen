import { describe, it, expect, vi, beforeEach } from 'vitest';

type Builder = Record<string, ReturnType<typeof vi.fn>> & {
  then: (cb: (r: { data: unknown; error: unknown }) => unknown) => Promise<unknown>;
};

let terminal: { data: unknown; error: unknown };

function makeBuilder(): Builder {
  const b: Record<string, unknown> = {};
  const chain = () => b as unknown as Builder;
  for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'in', 'is', 'limit']) {
    b[m] = vi.fn(chain);
  }
  b.then = (cb: (r: { data: unknown; error: unknown }) => unknown) =>
    Promise.resolve(cb(terminal));
  return b as unknown as Builder;
}

let builder: Builder;
const fromMock = vi.fn((_t: string) => builder);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => fromMock(t) },
}));

import {
  listBusinessTeams,
  createBusinessTeam,
  updateBusinessTeam,
  listBusinessTeamMembers,
  addBusinessTeamMember,
  deactivateBusinessTeamMember,
  listDelegatedWorkspaceAccess,
  createDelegatedWorkspaceAccess,
  revokeDelegatedWorkspaceAccess,
  listStaffActivitySessions,
} from '@/modules/workspace/governance';

beforeEach(() => {
  fromMock.mockClear();
  terminal = { data: [], error: null };
  builder = makeBuilder();
});

describe('business_teams wrappers', () => {
  it('listBusinessTeams filters business_id + is_active by default', async () => {
    await listBusinessTeams({ businessId: 'b1' });
    expect(fromMock).toHaveBeenCalledWith('business_teams');
    expect(builder.eq).toHaveBeenCalledWith('business_id', 'b1');
    expect(builder.eq).toHaveBeenCalledWith('is_active', true);
  });

  it('listBusinessTeams skips is_active filter when includeInactive=true', async () => {
    await listBusinessTeams({ businessId: 'b1', includeInactive: true });
    expect(builder.eq).toHaveBeenCalledWith('business_id', 'b1');
    expect(builder.eq).not.toHaveBeenCalledWith('is_active', true);
  });

  it('createBusinessTeam inserts into business_teams', async () => {
    await createBusinessTeam({ business_id: 'b1', name: 'Ops' });
    expect(fromMock).toHaveBeenCalledWith('business_teams');
    expect(builder.insert).toHaveBeenCalledWith({ business_id: 'b1', name: 'Ops' });
  });

  it('updateBusinessTeam updates by id', async () => {
    await updateBusinessTeam({ id: 't1', values: { name: 'Ops2' } });
    expect(builder.update).toHaveBeenCalledWith({ name: 'Ops2' });
    expect(builder.eq).toHaveBeenCalledWith('id', 't1');
  });
});

describe('business_team_members wrappers', () => {
  it('listBusinessTeamMembers filters team_id + is_active', async () => {
    await listBusinessTeamMembers({ teamId: 't1' });
    expect(fromMock).toHaveBeenCalledWith('business_team_members');
    expect(builder.eq).toHaveBeenCalledWith('team_id', 't1');
    expect(builder.eq).toHaveBeenCalledWith('is_active', true);
  });

  it('addBusinessTeamMember inserts', async () => {
    await addBusinessTeamMember({ team_id: 't1', business_staff_id: 's1' });
    expect(fromMock).toHaveBeenCalledWith('business_team_members');
    expect(builder.insert).toHaveBeenCalledWith({ team_id: 't1', business_staff_id: 's1' });
  });

  it('deactivateBusinessTeamMember sets is_active=false', async () => {
    await deactivateBusinessTeamMember('m1');
    expect(builder.update).toHaveBeenCalledWith({ is_active: false });
    expect(builder.eq).toHaveBeenCalledWith('id', 'm1');
  });
});

describe('delegated_workspace_access wrappers', () => {
  it('listDelegatedWorkspaceAccess optionally filters revoked_at IS NULL', async () => {
    await listDelegatedWorkspaceAccess({ businessId: 'b1', onlyActive: true });
    expect(fromMock).toHaveBeenCalledWith('delegated_workspace_access');
    expect(builder.eq).toHaveBeenCalledWith('business_id', 'b1');
    expect(builder.is).toHaveBeenCalledWith('revoked_at', null);
  });

  it('createDelegatedWorkspaceAccess inserts', async () => {
    const payload = {
      business_id: 'b1',
      delegated_to_user_id: 'u2',
      delegated_by_user_id: 'u1',
      reason: 'cover vacation',
      expires_at: '2026-12-31T00:00:00Z',
    };
    await createDelegatedWorkspaceAccess(payload);
    expect(fromMock).toHaveBeenCalledWith('delegated_workspace_access');
    expect(builder.insert).toHaveBeenCalledWith(payload);
  });

  it('revokeDelegatedWorkspaceAccess sets revoked_at and revoked_by', async () => {
    await revokeDelegatedWorkspaceAccess({ id: 'd1', revoked_by: 'u1' });
    expect(builder.update).toHaveBeenCalled();
    const args = (builder.update as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<string, unknown>;
    expect(args.revoked_by).toBe('u1');
    expect(typeof args.revoked_at).toBe('string');
    expect(builder.eq).toHaveBeenCalledWith('id', 'd1');
  });
});

describe('staff_activity_sessions wrappers', () => {
  it('listStaffActivitySessions filters business_id and applies limit', async () => {
    await listStaffActivitySessions({ businessId: 'b1', limit: 50 });
    expect(fromMock).toHaveBeenCalledWith('staff_activity_sessions');
    expect(builder.eq).toHaveBeenCalledWith('business_id', 'b1');
    expect(builder.limit).toHaveBeenCalledWith(50);
  });
});

describe('safety: wrappers return raw {data,error} and do not throw', () => {
  it('propagates error untouched', async () => {
    terminal = { data: null, error: { message: 'rls denied' } };
    const r = await listBusinessTeams({ businessId: 'b1' });
    expect(r).toEqual({ data: null, error: { message: 'rls denied' } });
  });
});