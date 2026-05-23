import { describe, it, expect, vi, beforeEach } from 'vitest';

type Builder = {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  then: (cb: (r: { data: unknown; error: unknown }) => unknown) => Promise<unknown>;
};

let terminalResult: { data: unknown; error: unknown };

function makeBuilder(): Builder {
  const b: Record<string, unknown> = {};
  const chain = () => b as unknown as Builder;
  b.select = vi.fn(chain);
  b.insert = vi.fn(chain);
  b.update = vi.fn(chain);
  b.delete = vi.fn(chain);
  b.eq = vi.fn(chain);
  b.in = vi.fn(chain);
  b.limit = vi.fn(chain);
  // Thenable so `await query` resolves to terminalResult.
  b.then = (cb: (r: { data: unknown; error: unknown }) => unknown) =>
    Promise.resolve(cb(terminalResult));
  return b as unknown as Builder;
}

let builder: Builder;
const fromMock = vi.fn((_t: string) => builder);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => fromMock(t) },
}));

import { listActiveStaffBusinessesForUser } from '../listActiveStaffBusinessesForUser';
import { listManagedStaffMembershipForUser } from '../listManagedStaffMembershipForUser';
import { listAllBusinessStaffForAdmin } from '../listAllBusinessStaffForAdmin';
import { insertBusinessStaff } from '../insertBusinessStaff';
import { updateBusinessStaffById } from '../updateBusinessStaffById';
import { deleteBusinessStaffById } from '../deleteBusinessStaffById';

beforeEach(() => {
  fromMock.mockClear();
  terminalResult = { data: [{ business_id: 'b1' }], error: null };
  builder = makeBuilder();
});

describe('listActiveStaffBusinessesForUser', () => {
  it("from('business_staff').select(sel).eq('user_id').eq('is_active', true)", async () => {
    await listActiveStaffBusinessesForUser({
      userId: 'u1',
      select: 'business_id, businesses:business_id(id, name_ar, name_en)',
    });
    expect(fromMock).toHaveBeenCalledWith('business_staff');
    expect(builder.select).toHaveBeenCalledWith(
      'business_id, businesses:business_id(id, name_ar, name_en)',
    );
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(builder.eq).toHaveBeenCalledWith('is_active', true);
    expect(builder.in).not.toHaveBeenCalled();
    expect(builder.limit).not.toHaveBeenCalled();
  });

  it('passes through { data, error } shape', async () => {
    terminalResult = { data: null, error: { message: 'boom' } };
    const r = await listActiveStaffBusinessesForUser({ userId: 'u1', select: 'business_id' });
    expect(r).toEqual({ data: null, error: { message: 'boom' } });
  });
});

describe('listManagedStaffMembershipForUser', () => {
  it("applies role IN ('owner','manager') and is_active=true", async () => {
    await listManagedStaffMembershipForUser({
      userId: 'u1',
      select: 'business_id, role, businesses:business_id(id, name_ar, name_en)',
    });
    expect(fromMock).toHaveBeenCalledWith('business_staff');
    expect(builder.select).toHaveBeenCalledWith(
      'business_id, role, businesses:business_id(id, name_ar, name_en)',
    );
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(builder.eq).toHaveBeenCalledWith('is_active', true);
    expect(builder.in).toHaveBeenCalledWith('role', ['owner', 'manager']);
    expect(builder.limit).not.toHaveBeenCalled();
  });

  it('applies limit when provided', async () => {
    await listManagedStaffMembershipForUser({ userId: 'u1', select: 'id', limit: 1 });
    expect(builder.limit).toHaveBeenCalledWith(1);
  });
});

describe('listAllBusinessStaffForAdmin', () => {
  it('selects without user_id / is_active filters', async () => {
    await listAllBusinessStaffForAdmin({ select: 'id, business_id, user_id, role, is_active' });
    expect(fromMock).toHaveBeenCalledWith('business_staff');
    expect(builder.select).toHaveBeenCalledWith('id, business_id, user_id, role, is_active');
    expect(builder.eq).not.toHaveBeenCalled();
    expect(builder.in).not.toHaveBeenCalled();
  });
});

describe('insertBusinessStaff', () => {
  it("from('business_staff').insert(payload) with no chained select", async () => {
    terminalResult = { data: null, error: null };
    const payload = {
      business_id: 'b1',
      user_id: 'u1',
      role: 'manager',
      invited_by: 'u2',
      is_active: true,
    };
    await insertBusinessStaff({ payload });
    expect(fromMock).toHaveBeenCalledWith('business_staff');
    expect(builder.insert).toHaveBeenCalledWith(payload);
    expect(builder.select).not.toHaveBeenCalled();
  });

  it('passes through error result unchanged', async () => {
    terminalResult = { data: null, error: { message: 'dup' } };
    const r = await insertBusinessStaff({ payload: { business_id: 'b1' } });
    expect(r).toEqual({ data: null, error: { message: 'dup' } });
  });
});

describe('updateBusinessStaffById', () => {
  it("from('business_staff').update(values).eq('id', id)", async () => {
    terminalResult = { data: null, error: null };
    await updateBusinessStaffById({ id: 'staff1', values: { role: 'owner' } });
    expect(fromMock).toHaveBeenCalledWith('business_staff');
    expect(builder.update).toHaveBeenCalledWith({ role: 'owner' });
    expect(builder.eq).toHaveBeenCalledWith('id', 'staff1');
    expect(builder.select).not.toHaveBeenCalled();
  });
});

describe('deleteBusinessStaffById', () => {
  it("from('business_staff').delete().eq('id', id)", async () => {
    terminalResult = { data: null, error: null };
    await deleteBusinessStaffById({ id: 'staff1' });
    expect(fromMock).toHaveBeenCalledWith('business_staff');
    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith('id', 'staff1');
  });
});