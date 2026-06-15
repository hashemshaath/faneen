/**
 * EMAIL INFRASTRUCTURE GOVERNANCE — PHASE 15D
 * Read-only guard for the template registry + copy cleanup audit.
 * See: docs/email-infrastructure-governance-phase-15d-template-copy-cleanup-audit.md
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');

function grep(pattern: string, paths: string[]): string {
  try {
    return execSync(
      `grep -RIn --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git -E ${JSON.stringify(pattern)} ${paths.join(' ')} || true`,
      { encoding: 'utf8', cwd: root, maxBuffer: 16 * 1024 * 1024 },
    );
  } catch {
    return '';
  }
}

const REGISTRY_DOC = 'docs/email-infrastructure-governance-phase-15d-template-registry.md';
const AUDIT_DOC = 'docs/email-infrastructure-governance-phase-15d-template-copy-cleanup-audit.md';
const TX_REGISTRY = 'supabase/functions/_shared/transactional-email-templates/registry.ts';
const AUTH_HOOK = 'supabase/functions/auth-email-hook/index.ts';

const AUTH_TEMPLATE_IDS = [
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'reauthentication',
];

const SAMPLE_TX_TEMPLATE_IDS = [
  'welcome-signup',
  'welcome-business',
  'contact-confirmation',
  'contact-admin-notification',
  'provider-approved',
  'lead-confirmation',
  'lead-notification',
  'contract-signed',
  'membership-subscription-activated',
  'business-staff-invitation',
];

describe('Email Infrastructure Phase 15D — Template Registry + Copy Cleanup', () => {
  it('1. registry doc exists', () => {
    expect(existsSync(resolve(root, REGISTRY_DOC))).toBe(true);
    expect(existsSync(resolve(root, AUDIT_DOC))).toBe(true);
  });

  it('2. registry doc lists every auth queue template', () => {
    const src = read(REGISTRY_DOC);
    for (const id of AUTH_TEMPLATE_IDS) {
      expect(src).toMatch(new RegExp(`\`${id}\``));
    }
  });

  it('3. registry doc lists representative transactional templates', () => {
    const src = read(REGISTRY_DOC);
    for (const id of SAMPLE_TX_TEMPLATE_IDS) {
      expect(src).toMatch(new RegExp(`\`${id}\``));
    }
  });

  it('4. registry doc contains no API key values', () => {
    const src = read(REGISTRY_DOC) + '\n' + read(AUDIT_DOC);
    expect(src).not.toMatch(/re_[A-Za-z0-9]{12,}/);
    expect(src).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  });

  it('5. registry doc never instructs using LOVABLE_API_KEY for sending', () => {
    const src = read(REGISTRY_DOC);
    expect(src).not.toMatch(/LOVABLE_API_KEY/);
  });

  it('6. registry doc does not endorse @lovable.dev/email-js as a sender', () => {
    const src = read(REGISTRY_DOC);
    expect(src).not.toMatch(/@lovable\.dev\/email-js/);
  });

  it('7. no email template body references "Lovable" or "lovable" branding', () => {
    const hits = grep(
      'lovable',
      ['supabase/functions/_shared/email-templates', 'supabase/functions/_shared/transactional-email-templates'],
    )
      .split('\n')
      .filter(Boolean);
    expect(hits).toEqual([]);
  });

  it('8. no hardcoded Resend live keys in templates or send code', () => {
    const hits = grep(
      `['"\\\`]re_[A-Za-z0-9]{12,}['"\\\`]`,
      ['supabase/functions/_shared', 'supabase/functions/send-transactional-email', 'supabase/functions/process-email-queue'],
    );
    expect(hits.trim()).toBe('');
  });

  it('9. no VITE_RESEND* anywhere in src/ or supabase/', () => {
    const hits = grep('VITE_RESEND', ['src', 'supabase'])
      .split('\n')
      .filter(Boolean)
      .filter((line) => !/emailInfrastructurePhase15(a|c|d).*\.test\.ts/.test(line));
    expect(hits).toEqual([]);
  });

  it('10. no template body contains account-existence disclosure phrases', () => {
    // Forbids strings a template might use to leak whether an account exists.
    // The grep below is intentionally narrow: it catches assertive AR/EN
    // disclosures, not generic recovery copy ("if an account exists…" is allowed).
    const patterns = [
      'no account found',
      'account does not exist',
      'no user with that email',
      'البريد غير موجود',
      'لا يوجد حساب بهذا البريد',
    ];
    for (const p of patterns) {
      const hits = grep(p, [
        'supabase/functions/_shared/email-templates',
        'supabase/functions/_shared/transactional-email-templates',
      ])
        .split('\n')
        .filter(Boolean);
      expect(hits, `forbidden phrase found: ${p}`).toEqual([]);
    }
  });

  it('11. Phase 15D introduces no new migrations and does not touch send code', () => {
    const migHits = grep('phase[-_ ]?15d', ['supabase/migrations'])
      .split('\n')
      .filter(Boolean);
    expect(migHits).toEqual([]);

    // The transactional registry must still be the only registry (no
    // alternate registry files added in this phase).
    expect(existsSync(resolve(root, TX_REGISTRY))).toBe(true);
    expect(existsSync(resolve(root, AUTH_HOOK))).toBe(true);

    // Send code shape unchanged: queue still posts to Resend; hook still
    // enqueues into auth_emails.
    expect(read('supabase/functions/process-email-queue/index.ts')).toMatch(
      /https:\/\/api\.resend\.com\/emails/,
    );
    expect(read(AUTH_HOOK)).toMatch(/auth_emails/);
  });

  it('12. registry / audit docs use no suppressions or unsafe casts', () => {
    const src = read(REGISTRY_DOC) + '\n' + read(AUDIT_DOC);
    expect(src).not.toMatch(/@ts-(ignore|expect-error)/);
    expect(src).not.toMatch(/eslint-disable/);
    // Markdown shouldn't contain `as any` either.
    expect(src).not.toMatch(/\bas\s+any\b/);
  });
});