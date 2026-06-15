/**
 * EMAIL INFRASTRUCTURE GOVERNANCE — PHASE 15F
 * Read-only guard for the full email-stack regression + external deploy checklist.
 * See: docs/email-infrastructure-governance-phase-15f-full-email-regression.md
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
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

const QUEUE = 'supabase/functions/process-email-queue/index.ts';
const TX = 'supabase/functions/send-transactional-email/index.ts';
const HOOK = 'supabase/functions/auth-email-hook/index.ts';
const WRAPPER = 'src/modules/notifications/services/sendTransactionalEmail.ts';
const REGISTRY = 'supabase/functions/_shared/transactional-email-templates/registry.ts';
const DOC_15A = 'docs/email-infrastructure-governance-phase-15a-central-resend-audit.md';
const DOC_15C = 'docs/email-infrastructure-governance-phase-15c-auth-queue-resend-migration.md';
const DOC_15D_REGISTRY = 'docs/email-infrastructure-governance-phase-15d-template-registry.md';
const DOC_15D_COPY = 'docs/email-infrastructure-governance-phase-15d-template-copy-cleanup-audit.md';
const DOC_15E = 'docs/email-infrastructure-governance-phase-15e-logs-deliverability-audit.md';
const DOC_15F = 'docs/email-infrastructure-governance-phase-15f-full-email-regression.md';

// Files that may legitimately mention Lovable webhook parser / HMAC verifier.
// These are receivers, NOT senders, and were acknowledged in Phase 15A/15C.
const LOVABLE_RECEIVER_ALLOWLIST = new Set([
  HOOK,
  'supabase/functions/handle-email-suppression/index.ts',
]);

describe('Email Infrastructure Phase 15F — Full Email Regression', () => {
  it('1. no @lovable.dev/email-js sender usage outside the receiver allowlist', () => {
    const hits = grep('@lovable\\.dev/email-js', ['src', 'supabase/functions'])
      .split('\n')
      .filter(Boolean)
      .filter((line) => !/\.test\.ts:|\.md:/.test(line))
      .filter((line) => ![...LOVABLE_RECEIVER_ALLOWLIST].some((p) => line.startsWith(`${p}:`)));
    expect(hits, `unexpected @lovable.dev/email-js usage: ${hits.join('\n')}`).toEqual([]);
  });

  it('2. no sendLovableEmail anywhere in app code', () => {
    const hits = grep('sendLovableEmail', ['src', 'supabase/functions'])
      .split('\n')
      .filter(Boolean)
      .filter((line) => !/\.test\.ts:|\.md:/.test(line));
    expect(hits).toEqual([]);
  });

  it('3. no LOVABLE_API_KEY used by any sender', () => {
    for (const p of [QUEUE, TX, WRAPPER]) {
      expect(read(p)).not.toMatch(/LOVABLE_API_KEY/);
    }
  });

  it('4. no LOVABLE_SEND_URL anywhere in app code', () => {
    const hits = grep('LOVABLE_SEND_URL', ['src', 'supabase/functions'])
      .split('\n')
      .filter(Boolean)
      .filter((line) => !/\.test\.ts:|\.md:/.test(line));
    expect(hits).toEqual([]);
  });

  it('5. no Lovable send gateway is imported, called, or referenced as a runtime fallback', () => {
    for (const p of [QUEUE, TX]) {
      const src = read(p);
      // No Lovable email SDK import
      expect(src).not.toMatch(/@lovable\.dev\/email/);
      // No alternate send URL
      expect(src).not.toMatch(/connector-gateway\.lovable\.dev/);
      // No conditional path that calls a Lovable sender as fallback
      expect(src).not.toMatch(/sendLovableEmail/);
    }
  });

  it('6. process-email-queue posts to Resend', () => {
    const src = read(QUEUE);
    expect(src).toMatch(/https:\/\/api\.resend\.com\/emails/);
    expect(src).toMatch(/RESEND_API_KEY/);
  });

  it('7. send-transactional-email posts to Resend', () => {
    const src = read(TX);
    expect(src).toMatch(/https:\/\/api\.resend\.com\/emails/);
    expect(src).toMatch(/RESEND_API_KEY/);
  });

  it('8. sendTransactionalEmail wrapper exists and invokes the edge function', () => {
    expect(existsSync(resolve(root, WRAPPER))).toBe(true);
    const src = read(WRAPPER);
    expect(src).toMatch(/send-transactional-email/);
  });

  it('9. no VITE_RESEND* anywhere in src/ or supabase/', () => {
    const hits = grep('VITE_RESEND', ['src', 'supabase'])
      .split('\n')
      .filter(Boolean)
      .filter((line) => !/emailInfrastructurePhase15[a-z]?.*\.test\.ts/.test(line));
    expect(hits).toEqual([]);
  });

  it('10. no hardcoded Resend live keys anywhere in src/ or supabase/', () => {
    const literalKey = /re_[A-Za-z0-9]{12,}/;
    const out = execSync(
      `grep -RIn --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git -E ${JSON.stringify(literalKey.source)} src supabase || true`,
      { encoding: 'utf8', cwd: root, maxBuffer: 16 * 1024 * 1024 },
    );
    const hits = out.split('\n').filter(Boolean).filter((l) => !/\.test\.ts:/.test(l));
    expect(hits, `unexpected re_ literal: ${hits.join('\n')}`).toEqual([]);
  });

  it('11. template registry exists with 60 transactional entries', () => {
    expect(existsSync(resolve(root, REGISTRY))).toBe(true);
    const src = read(REGISTRY);
    const entries = src.match(/^\s*['"][a-z][a-z0-9-]+['"]:/gm) ?? [];
    expect(entries.length).toBeGreaterThanOrEqual(60);
  });

  it('12. all Phase 15 docs exist (logs/deliverability + registry)', () => {
    for (const doc of [DOC_15A, DOC_15C, DOC_15D_REGISTRY, DOC_15D_COPY, DOC_15E, DOC_15F]) {
      expect(existsSync(resolve(root, doc)), `missing doc: ${doc}`).toBe(true);
    }
  });

  it('13. Phase 15F doc contains no API keys or JWTs', () => {
    const src = read(DOC_15F);
    expect(src).not.toMatch(/re_[A-Za-z0-9]{12,}/);
    expect(src).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  });

  it('14. no account-existence leak strings in any email template', () => {
    const phrases = [
      'no account found',
      'account does not exist',
      'no user with that email',
      'البريد غير موجود',
      'لا يوجد حساب بهذا البريد',
    ];
    for (const phrase of phrases) {
      const hits = grep(phrase, [
        'supabase/functions/_shared/email-templates',
        'supabase/functions/_shared/transactional-email-templates',
      ])
        .split('\n')
        .filter(Boolean);
      expect(hits, `forbidden phrase in templates: ${phrase}`).toEqual([]);
    }
  });

  it('15. Phase 15F doc does not claim delivered/bounced/complained without webhook source', () => {
    const src = read(DOC_15F);
    // Must explicitly state the webhook gap and defer it to 15G.
    expect(src).toMatch(/Resend webhook/i);
    expect(src).toMatch(/15G/);
    expect(src).toMatch(/not.*launch blocker/i);
  });

  it('16. Phase 15F introduces no new migrations', () => {
    const migHits = grep('phase[-_ ]?15f', ['supabase/migrations'])
      .split('\n')
      .filter(Boolean);
    expect(migHits).toEqual([]);
  });

  it('17. sender path shape is unchanged since 15C (Resend HTTPS, queue + tx)', () => {
    expect(read(QUEUE)).toMatch(/https:\/\/api\.resend\.com\/emails/);
    expect(read(TX)).toMatch(/https:\/\/api\.resend\.com\/emails/);
    expect(read(HOOK)).toMatch(/enqueue_email/);
  });

  it('18. Phase 15F doc + guard contain no suppressions or unsafe casts', () => {
    const src = read(DOC_15F);
    expect(src).not.toMatch(/@ts-(ignore|expect-error)/);
    expect(src).not.toMatch(/eslint-disable/);
    expect(src).not.toMatch(/\bas\s+any\b/);
    expect(src).not.toMatch(/:\s*any\b/);
  });

  it('19. only the two canonical senders + the admin diagnostic post to Resend (no duplicate user-facing senders)', () => {
    const fnDirs = readdirSync(resolve(root, 'supabase/functions'));
    // A second user-facing sender would surface as another folder posting to api.resend.com/emails.
    // `resend-status` is an explicit admin-only diagnostic (action=test) and is allowlisted.
    const ALLOWED_DIAGNOSTICS = new Set(['resend-status']);
    const resendPosters: string[] = [];
    for (const dir of fnDirs) {
      const indexPath = `supabase/functions/${dir}/index.ts`;
      if (!existsSync(resolve(root, indexPath))) continue;
      const src = read(indexPath);
      if (/https:\/\/api\.resend\.com\/emails/.test(src)) resendPosters.push(dir);
    }
    const userFacing = resendPosters.filter((d) => !ALLOWED_DIAGNOSTICS.has(d)).sort();
    expect(userFacing).toEqual(['process-email-queue', 'send-transactional-email']);
  });

  it('20. Phase 15G webhook follow-up is documented as deferred', () => {
    const src = read(DOC_15F);
    expect(src).toMatch(/PHASE 15G/);
    expect(src).toMatch(/RESEND WEBHOOK EVENTS/i);
  });
});