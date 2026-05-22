import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Builder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
};

function makeBuilder(result: { data: unknown; error: unknown }): Builder {
  const b: Record<string, unknown> = {};
  const chain = () => b as unknown as Builder;
  b.select = vi.fn(chain);
  b.eq = vi.fn(chain);
  b.maybeSingle = vi.fn(() => Promise.resolve(result));
  b.single = vi.fn(() => Promise.resolve(result));
  return b as unknown as Builder;
}

let builder: Builder;
const fromMock = vi.fn((_t: string) => builder);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => fromMock(t) },
}));

import { getProfileByEmail } from '../getProfileByEmail';

beforeEach(() => {
  fromMock.mockClear();
  builder = makeBuilder({ data: { user_id: 'u1' }, error: null });
});

describe('getProfileByEmail', () => {
  it("default maybeSingle: from('profiles').select('user_id').eq('email', email).maybeSingle()", async () => {
    await getProfileByEmail({ email: 'a@b.com' });
    expect(fromMock).toHaveBeenCalledWith('profiles');
    expect(builder.select).toHaveBeenCalledWith('user_id');
    expect(builder.eq).toHaveBeenCalledWith('email', 'a@b.com');
    expect(builder.maybeSingle).toHaveBeenCalled();
    expect(builder.single).not.toHaveBeenCalled();
  });

  it('honors custom select', async () => {
    await getProfileByEmail({ email: 'a@b.com', select: 'user_id, full_name' });
    expect(builder.select).toHaveBeenCalledWith('user_id, full_name');
  });

  it('terminal:"single" uses .single()', async () => {
    await getProfileByEmail({ email: 'a@b.com', terminal: 'single' });
    expect(builder.single).toHaveBeenCalled();
    expect(builder.maybeSingle).not.toHaveBeenCalled();
  });

  it('does not normalize email (caller controls casing/trim)', async () => {
    await getProfileByEmail({ email: '  A@B.com ' });
    expect(builder.eq).toHaveBeenCalledWith('email', '  A@B.com ');
  });

  it('passes through { data, error } shape', async () => {
    builder = makeBuilder({ data: null, error: { message: 'rls' } });
    const r = await getProfileByEmail({ email: 'a@b.com' });
    expect(r).toEqual({ data: null, error: { message: 'rls' } });
  });
});

// ─── P-5B migration regression locks ──────────────────────────
const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf-8');

describe('P-5B secondary profile read migration', () => {
  it('BlogComments uses listProfilesByUserIds (no direct profiles read)', () => {
    const src = read('src/components/blog/BlogComments.tsx');
    expect(src).not.toMatch(/supabase\.from\(['"]profiles['"]\)/);
    expect(src).toContain('listProfilesByUserIds');
    expect(src).toContain("'user_id, full_name, avatar_url'");
  });

  it('BlogPost author lookup uses getProfileByUserId (no direct profiles read)', () => {
    const src = read('src/pages/BlogPost.tsx');
    expect(src).not.toMatch(/supabase\.from\(['"]profiles['"]\)/);
    expect(src).toContain('getProfileByUserId');
    expect(src).toContain("'full_name, ref_id'");
    expect(src).toContain("['blog-post-author', post?.author_id]");
  });

  it('InvitationsPanel inviter lookup uses getProfileByUserId', () => {
    const src = read('src/components/dashboard/business-edit/InvitationsPanel.tsx');
    expect(src).not.toMatch(/supabase\.from\(['"]profiles['"]\)/);
    expect(src).toContain('getProfileByUserId');
    expect(src).toContain("'full_name'");
  });

  it('AuditLogPanel actor lookup uses listProfilesByUserIds', () => {
    const src = read('src/components/dashboard/business-edit/AuditLogPanel.tsx');
    expect(src).not.toMatch(/supabase\.from\(['"]profiles['"]\)/);
    expect(src).toContain('listProfilesByUserIds');
    expect(src).toContain("'user_id, full_name, email, ref_id'");
  });

  it('contracts list service uses listProfilesByUserIds for participant profiles', () => {
    const src = read('src/modules/contracts/services/list.ts');
    expect(src).not.toMatch(/\.from\(['"]profiles['"]\)/);
    expect(src).toContain('listProfilesByUserIds');
    expect(src).toContain("'user_id, full_name, avatar_url, phone, email'");
  });

  it('DashboardContracts email lookup uses getProfileByEmail (no direct profiles read)', () => {
    const src = read('src/pages/dashboard/DashboardContracts.tsx');
    expect(src).not.toMatch(/supabase\.from\(['"]profiles['"]\)/);
    expect(src).toContain('getProfileByEmail');
  });
});

// P-5B out-of-scope guardrail removed: profile mutations migrated in P-7
// (see profileMutations.test.ts).