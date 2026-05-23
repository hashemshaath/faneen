import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(process.cwd(), 'src');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

const FILES = {
  resetPassword: 'pages/ResetPassword.tsx',
  forgotForm: 'components/auth/ForgotPasswordForm.tsx',
  adminAccess: 'pages/admin/AdminAccessManagement.tsx',
  logPanel: 'components/admin/PasswordResetLogPanel.tsx',
  tempCode: 'components/auth/TemporaryCodeForm.tsx',
  authService: 'services/auth/authService.ts',
} as const;

describe('ID-4 migration guardrails', () => {
  it('ResetPassword uses createPasswordResetLog wrapper', () => {
    const f = read(FILES.resetPassword);
    expect(f).toMatch(/createPasswordResetLog/);
    expect(f).not.toMatch(/from\(['"]password_reset_log['"]\)/);
  });

  it('ForgotPasswordForm uses createPasswordResetLog wrapper', () => {
    const f = read(FILES.forgotForm);
    expect(f).toMatch(/createPasswordResetLog/);
    expect(f).not.toMatch(/from\(['"]password_reset_log['"]\)/);
  });

  it('AdminAccessManagement uses listPasswordResetLogs wrapper', () => {
    const f = read(FILES.adminAccess);
    expect(f).toMatch(/listPasswordResetLogs/);
    expect(f).not.toMatch(/from\(['"]password_reset_log['"]\)/);
  });

  it('PasswordResetLogPanel uses listPasswordResetLogs wrapper', () => {
    const f = read(FILES.logPanel);
    expect(f).toMatch(/listPasswordResetLogs/);
    expect(f).not.toMatch(/from\(['"]password_reset_log['"]\)/);
  });

  it('TemporaryCodeForm uses temp-code wrappers and no direct supabase usage', () => {
    const f = read(FILES.tempCode);
    expect(f).toMatch(/createTempCodeSession/);
    expect(f).toMatch(/verifyTemporaryCodeOtp/);
    expect(f).not.toMatch(/functions\.invoke\(['"]temp-code-session['"]/);
    expect(f).not.toMatch(/supabase\.auth\.verifyOtp/);
    expect(f).not.toMatch(/from ['"]@\/integrations\/supabase\/client['"]/);
  });

  it('authService OTP wrappers remain unchanged (still own resetPasswordForEmail + verifyOtp)', () => {
    const f = read(FILES.authService);
    expect(f).toMatch(/supabase\.auth\.resetPasswordForEmail/);
    expect(f).toMatch(/supabase\.auth\.verifyOtp/);
  });

  it('does not log raw password or OTP values in any migrated file', () => {
    for (const path of [FILES.resetPassword, FILES.forgotForm, FILES.tempCode]) {
      const f = read(path);
      expect(f, `${path} must not log raw password`).not.toMatch(/console\.\w+\([^)]*\bpassword\b/);
      expect(f, `${path} must not log raw otp`).not.toMatch(/console\.\w+\([^)]*\b(otp|otpCode|token_hash)\b/);
    }
  });

  it('password_reset_log payloads never include password / otp / token fields', () => {
    const haystack = read(FILES.resetPassword) + '\n' + read(FILES.forgotForm);
    // Locate every createPasswordResetLog(...) call and inspect the literal payload.
    const calls = haystack.match(/createPasswordResetLog\(\{[\s\S]*?\}\)/g) ?? [];
    expect(calls.length).toBeGreaterThan(0);
    for (const c of calls) {
      expect(c).not.toMatch(/\bpassword\s*:/);
      expect(c).not.toMatch(/\botp\s*:/);
      expect(c).not.toMatch(/\btoken(_hash)?\s*:/);
      expect(c).not.toMatch(/\bnew_password\s*:/);
    }
  });
});