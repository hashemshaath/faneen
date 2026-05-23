import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(process.cwd(), 'src');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

const FILES = {
  settings: 'pages/dashboard/DashboardSettings.tsx',
  diag: 'pages/dashboard/DashboardAccountDiagnostics.tsx',
  ping: 'hooks/useProviderActivityPing.ts',
  editor: 'components/blog/RichMarkdownEditor.tsx',
  invite: 'pages/InviteAccept.tsx',
  staffInvite: 'pages/StaffInviteAccept.tsx',
  myInvites: 'components/dashboard/MyInvitationsStatus.tsx',
  authCtx: 'contexts/AuthContext.tsx',
  authService: 'services/auth/authService.ts',
  tempCode: 'components/auth/TemporaryCodeForm.tsx',
} as const;

describe('ID-5 migration guardrails', () => {
  it('DashboardSettings uses identity wrappers (getCurrentSession/updateUserPassword/signOutCurrentUser)', () => {
    const f = read(FILES.settings);
    expect(f).toMatch(/getCurrentSession/);
    expect(f).toMatch(/updateUserPassword/);
    expect(f).toMatch(/signOutCurrentUser/);
    expect(f).not.toMatch(/supabase\.auth\.(getSession|signOut|updateUser)\(/);
  });

  it('DashboardAccountDiagnostics uses getCurrentSession wrapper', () => {
    const f = read(FILES.diag);
    expect(f).toMatch(/getCurrentSession/);
    expect(f).not.toMatch(/supabase\.auth\.getSession\(/);
  });

  it('useProviderActivityPing uses getCurrentUser wrapper', () => {
    const f = read(FILES.ping);
    expect(f).toMatch(/getCurrentUser/);
    expect(f).not.toMatch(/supabase\.auth\.getUser\(/);
  });

  it('RichMarkdownEditor uses getCurrentUser wrapper', () => {
    const f = read(FILES.editor);
    expect(f).toMatch(/getCurrentUser/);
    expect(f).not.toMatch(/supabase\.auth\.getUser\(/);
  });

  it('InviteAccept uses acceptClientInvitation + signOutCurrentUser wrappers', () => {
    const f = read(FILES.invite);
    expect(f).toMatch(/acceptClientInvitation/);
    expect(f).toMatch(/signOutCurrentUser/);
    expect(f).not.toMatch(/supabase\.rpc\(['"]accept_client_invitation['"]/);
    expect(f).not.toMatch(/supabase\.auth\.signOut\(/);
  });

  it('StaffInviteAccept uses staff invitation wrappers', () => {
    const f = read(FILES.staffInvite);
    expect(f).toMatch(/getStaffInvitationPreview/);
    expect(f).toMatch(/acceptStaffInvitation/);
    expect(f).not.toMatch(/supabase\.rpc\(['"]get_staff_invitation_preview['"]/);
    expect(f).not.toMatch(/supabase\s*\.\s*rpc\(['"]accept_staff_invitation['"]/);
  });

  it('MyInvitationsStatus uses listMyStaffInvitations wrapper', () => {
    const f = read(FILES.myInvites);
    expect(f).toMatch(/listMyStaffInvitations/);
    expect(f).not.toMatch(/supabase\.rpc\(['"]get_my_staff_invitations['"]/);
  });

  it('AuthContext remains allowed central session owner (getSession + signOut)', () => {
    const f = read(FILES.authCtx);
    expect(f).toMatch(/supabase\.auth\.getSession\(/);
    expect(f).toMatch(/supabase\.auth\.signOut\(/);
  });

  it('authService keeps its existing supabase.auth surface (updatePassword, signOut)', () => {
    const f = read(FILES.authService);
    expect(f).toMatch(/supabase\.auth\.updateUser\(\{ password \}\)/);
    expect(f).toMatch(/supabase\.auth\.signOut\(/);
  });

  it('ID-4 temp-code wrappers remain unchanged', () => {
    const f = read(FILES.tempCode);
    expect(f).toMatch(/createTempCodeSession/);
    expect(f).toMatch(/verifyTemporaryCodeOtp/);
  });

  it('no migrated file logs raw password/session/token/user values', () => {
    const patterns = [/console\.\w+\([^)]*\bpassword\b/, /console\.\w+\([^)]*\bsession\b/, /console\.\w+\([^)]*\btoken\b/];
    for (const path of Object.values(FILES)) {
      const f = read(path);
      for (const p of patterns) {
        expect(f, `${path} must not console-log via ${p}`).not.toMatch(p);
      }
    }
  });
});