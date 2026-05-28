import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const EDGE = 'supabase/functions/admin-create-business-with-owner/index.ts';
const WRAPPER = 'src/modules/businesses/services/adminCreateBusinessWithOwner.ts';
const PAGE = 'src/pages/admin/AdminBusinesses.tsx';

describe('ADMIN-BUSINESS-CREATE-OWNER edge function source invariants', () => {
  it('edge function file exists', () => {
    expect(existsSync(resolve(EDGE))).toBe(true);
  });

  const src = existsSync(resolve(EDGE)) ? readFileSync(resolve(EDGE), 'utf8') : '';

  it('handles CORS preflight', () => {
    expect(src).toMatch(/req\.method\s*===\s*["']OPTIONS["']/);
    expect(src).toMatch(/Access-Control-Allow-Origin/);
  });

  it('requires Authorization header (401 missing_auth)', () => {
    expect(src).toContain('missing_auth');
    expect(src).toMatch(/Authorization/);
  });

  it('enforces admin / super_admin caller (403 forbidden_admin_only)', () => {
    expect(src).toContain('is_super_admin');
    expect(src).toMatch(/has_role[\s\S]*['"]admin['"]/);
    expect(src).toContain('forbidden_admin_only');
  });

  it('supports the three owner modes', () => {
    expect(src).toMatch(/owner\.mode\s*===\s*["']existing["']/);
    expect(src).toMatch(/owner\.mode\s*===\s*["']new["']/);
    expect(src).toMatch(/owner\.mode\s*===\s*["']invite["']/);
  });

  it('rejects duplicate email and duplicate username pre-flight', () => {
    expect(src).toContain('owner_email_taken');
    expect(src).toContain('username_taken');
    expect(src).toMatch(/\.ilike\(["']email["']/);
    expect(src).toMatch(/\.ilike\(["']username["']/);
  });

  it('blocks super_admin as business owner (defence-in-depth)', () => {
    expect(src).toContain('owner_cannot_be_super_admin');
    expect(src).toMatch(/has_role[\s\S]*super_admin/);
  });

  it('rolls back the newly-created auth user when the business insert fails', () => {
    expect(src).toMatch(/ownerCreatedNow[\s\S]*deleteUser\(ownerUserId\)/);
  });

  it('generates a recovery link in invite mode only', () => {
    expect(src).toMatch(/owner\.mode\s*===\s*["']invite["'][\s\S]*generateLink/);
    expect(src).toMatch(/type:\s*["']recovery["']/);
  });

  it('writes an admin_activity_log entry with structured details', () => {
    expect(src).toContain("admin_activity_log");
    expect(src).toContain('create_business_with_owner');
    expect(src).toContain('owner_mode');
    expect(src).toContain('owner_user_id');
  });

  it('persists account_manager_* fields on the business row', () => {
    expect(src).toContain('account_manager_name');
    expect(src).toContain('account_manager_phone');
    expect(src).toContain('account_manager_email');
    expect(src).toContain('account_manager_position');
  });

  it('never logs password, recovery link, or service-role key', () => {
    expect(src).not.toMatch(/console\.(log|info|warn|error)\([^)]*password/i);
    expect(src).not.toMatch(/console\.(log|info|warn|error)\([^)]*recovery_link/i);
    expect(src).not.toMatch(/console\.(log|info|warn|error)\([^)]*service_role/i);
    expect(src).not.toMatch(/console\.(log|info|warn|error)\([^)]*SERVICE_ROLE_KEY/i);
    expect(src).not.toMatch(/details:\s*\{[^}]*recovery_link/);
    expect(src).not.toMatch(/details:\s*\{[^}]*\bpassword\b/);
  });

  it('validates owner email format and password length for new mode', () => {
    expect(src).toContain('invalid_owner_email');
    expect(src).toContain('password_too_short');
  });

  it('uses service-role client for privileged ops', () => {
    expect(src).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(src).toMatch(/createClient\(supabaseUrl,\s*serviceRoleKey\)/);
  });
});

describe('ADMIN-BUSINESS-CREATE-OWNER service wrapper', () => {
  it('invokes the edge function by name', () => {
    const s = readFileSync(resolve(WRAPPER), 'utf8');
    expect(s).toContain('supabase.functions.invoke');
    expect(s).toContain('admin-create-business-with-owner');
  });
  it('exposes the three OwnerMode values', () => {
    const s = readFileSync(resolve(WRAPPER), 'utf8');
    expect(s).toMatch(/OwnerMode\s*=\s*['"]existing['"]\s*\|\s*['"]new['"]\s*\|\s*['"]invite['"]/);
  });
});

describe('ADMIN-BUSINESS-CREATE-OWNER UI integration (AdminBusinesses.tsx)', () => {
  const src = readFileSync(resolve(PAGE), 'utf8');

  it('imports the service wrapper', () => {
    expect(src).toContain('adminCreateBusinessWithOwner');
    expect(src).toContain('@/modules/businesses/services/adminCreateBusinessWithOwner');
  });

  it('renders the three owner mode tabs', () => {
    expect(src).toMatch(/id:\s*['"]existing['"]/);
    expect(src).toMatch(/id:\s*['"]new['"]/);
    expect(src).toMatch(/id:\s*['"]invite['"]/);
  });

  it('collects manager full name, position, email, password, phone in new mode', () => {
    expect(src).toContain('owner_full_name');
    expect(src).toContain('owner_position');
    expect(src).toContain('owner_email');
    expect(src).toContain('owner_password');
    expect(src).toContain('owner_phone');
  });

  it('passes auto_confirm and redirect_to to the edge function', () => {
    expect(src).toMatch(/auto_confirm:\s*true/);
    expect(src).toMatch(/redirect_to:[\s\S]{0,80}reset-password/);
  });

  it('validates owner email format and password length client-side', () => {
    expect(src).toMatch(/\/\^\[\^\\s@\]\+@\[\^\\s@\]\+\\\.\[\^\\s@\]\+\$\//);
    expect(src).toMatch(/owner_password[\s\S]{0,40}length\s*<\s*8/);
  });

  it('never echoes the raw password back after submit', () => {
    expect(src).not.toMatch(/toast\.[a-z]+\([^)]*owner_password/);
    expect(src).not.toMatch(/res\.owner\?\.password/);
  });

  it('routes mutation errors through the localized error mapper', () => {
    expect(src).toContain('mapAdminCreateBizError');
    expect(src).toContain('adminCreateBusinessWithOwnerErrors');
    // The raw error message must NOT be passed directly as the toast description
    expect(src).not.toMatch(/description:\s*err\.message/);
  });
});
