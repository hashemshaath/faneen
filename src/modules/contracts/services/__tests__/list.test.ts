import { describe, it, expect, vi, beforeEach } from 'vitest';

type Result<T> = { data: T | null; error: { message: string } | null };

interface ContractsBuilder {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  _result: Result<unknown[]>;
}

interface ProfilesBuilder {
  select: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  _result: Result<unknown[]>;
}

const contractsState: ContractsBuilder = {
  select: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
  _result: { data: [], error: null },
};
const profilesState: ProfilesBuilder = {
  select: vi.fn(),
  in: vi.fn(),
  _result: { data: [], error: null },
};

const fromMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (table: string) => fromMock(table) },
}));

function resetState() {
  contractsState._result = { data: [], error: null };
  profilesState._result = { data: [], error: null };
  contractsState.select.mockReset();
  contractsState.eq.mockReset();
  contractsState.order.mockReset();
  profilesState.select.mockReset();
  profilesState.in.mockReset();
  fromMock.mockReset();

  const contractsBuilder = {
    select: contractsState.select.mockReturnThis(),
    eq: contractsState.eq.mockReturnThis(),
    order: contractsState.order.mockImplementation(() => Promise.resolve(contractsState._result)),
  };
  const profilesBuilder = {
    select: profilesState.select.mockReturnThis(),
    in: profilesState.in.mockImplementation(() => Promise.resolve(profilesState._result)),
  };

  fromMock.mockImplementation((table: string) => {
    if (table === 'contracts') return contractsBuilder;
    if (table === 'profiles') return profilesBuilder;
    throw new Error(`unexpected table ${table}`);
  });
}

beforeEach(() => {
  resetState();
});

describe('listContractsForRole', () => {
  it('uses provider_id filter for provider role and orders by created_at desc', async () => {
    const { listContractsForRole } = await import('../list');
    contractsState._result = { data: [{ id: 'c1' }], error: null };
    const rows = await listContractsForRole({ userId: 'u1', role: 'provider' });
    expect(fromMock).toHaveBeenCalledWith('contracts');
    expect(contractsState.select).toHaveBeenCalledWith('*');
    expect(contractsState.eq).toHaveBeenCalledWith('provider_id', 'u1');
    expect(contractsState.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(rows).toEqual([{ id: 'c1' }]);
  });

  it('uses client_id filter for client role', async () => {
    const { listContractsForRole } = await import('../list');
    await listContractsForRole({ userId: 'u2', role: 'client' });
    expect(contractsState.eq).toHaveBeenCalledWith('client_id', 'u2');
  });

  it('throws on query error', async () => {
    const { listContractsForRole } = await import('../list');
    contractsState._result = { data: null, error: { message: 'boom' } };
    await expect(
      listContractsForRole({ userId: 'u1', role: 'provider' }),
    ).rejects.toMatchObject({ message: 'boom' });
  });

  it('returns [] when data is null', async () => {
    const { listContractsForRole } = await import('../list');
    contractsState._result = { data: null, error: null };
    const rows = await listContractsForRole({ userId: 'u1', role: 'provider' });
    expect(rows).toEqual([]);
  });
});

describe('getContractParticipantProfiles', () => {
  it('returns [] without querying when userIds is empty', async () => {
    const { getContractParticipantProfiles } = await import('../list');
    const rows = await getContractParticipantProfiles([]);
    expect(rows).toEqual([]);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('selects exact allowed profile columns', async () => {
    const { getContractParticipantProfiles } = await import('../list');
    profilesState._result = { data: [{ user_id: 'u1' }], error: null };
    const rows = await getContractParticipantProfiles(['u1', 'u2']);
    expect(fromMock).toHaveBeenCalledWith('profiles');
    expect(profilesState.select).toHaveBeenCalledWith(
      'user_id, full_name, avatar_url, phone, email',
    );
    expect(profilesState.in).toHaveBeenCalledWith('user_id', ['u1', 'u2']);
    expect(rows).toEqual([{ user_id: 'u1' }]);
  });

  it('throws on profiles query error', async () => {
    const { getContractParticipantProfiles } = await import('../list');
    profilesState._result = { data: null, error: { message: 'rls' } };
    await expect(getContractParticipantProfiles(['u1'])).rejects.toMatchObject({
      message: 'rls',
    });
  });
});