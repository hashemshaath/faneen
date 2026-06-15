/**
 * EMAIL INFRASTRUCTURE GOVERNANCE — PHASE 15A
 * Read-only guard test. Pins current state and flags off-policy paths.
 * See: docs/email-infrastructure-governance-phase-15a-central-resend-audit.md
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

describe('Email Infrastructure Phase 15A — Central Resend audit guards', () => {
  it('no VITE_RESEND_* env reference exists in client source', () => {
    const hits = grep('VITE_RESEND', ['src'])
      .split('\n')
      .filter(Boolean)
      .filter((line) => !/emailInfrastructurePhase15(a|c).*\.test\.ts/.test(line));
    expect(hits).toEqual([]);
  });

  it('no hardcoded Resend live key (re_...) appears in src or supabase', () => {
    // Restrict to obvious literal patterns inside quotes to avoid prose hits.
    const hits = grep(`['"\\\`]re_[A-Za-z0-9]{12,}['"\\\`]`, ['src', 'supabase']);
    expect(hits.trim()).toBe('');
  });

  it('no Resend SDK is imported from client code (src/)', () => {
    const hits = grep(`from\\s+['"](resend|@resend/[^'\"]+)['"]`, ['src']);
    expect(hits.trim()).toBe('');
  });

  it('RESEND_API_KEY is only read via Deno.env.get inside supabase/functions/', () => {
    const hits = grep('RESEND_API_KEY', ['src']);
    // Allowed in src: display-only label strings inside admin UI files, and this audit test itself.
    const offending = hits
      .split('\n')
      .filter(Boolean)
      .filter((line) => !/AdminIntegrations\.tsx|ResendIntegrationCard\.tsx|emailInfrastructurePhase15(a|c).*\.test\.ts/.test(line));
    expect(offending).toEqual([]);
  });

  it('canonical client wrapper exists at the approved path', () => {
    const p = 'src/modules/notifications/services/sendTransactionalEmail.ts';
    expect(existsSync(resolve(root, p))).toBe(true);
    expect(read(p)).toMatch(/supabase\.functions\.invoke\(['"]send-transactional-email['"]/);
  });

  it('send-transactional-email edge function posts to Resend (api.resend.com/emails)', () => {
    const src = read('supabase/functions/send-transactional-email/index.ts');
    expect(src).toMatch(/https:\/\/api\.resend\.com\/emails/);
    expect(src).toMatch(/Deno\.env\.get\(['"]RESEND_API_KEY['"]\)/);
  });

  it('Phase 15C: process-email-queue now dispatches via Resend (Lovable gateway removed)', () => {
    const src = read('supabase/functions/process-email-queue/index.ts');
    expect(src).not.toMatch(/@lovable\.dev\/email-js/);
    expect(src).not.toMatch(/sendLovableEmail/);
    expect(src).toMatch(/https:\/\/api\.resend\.com\/emails/);
    expect(src).toMatch(/Deno\.env\.get\(['"]RESEND_API_KEY['"]\)/);
  });

  it('no client component invokes send-transactional-email outside the wrapper', () => {
    const hits = grep(
      `supabase\\.functions\\.invoke\\(\\s*['"]send-transactional-email`,
      ['src'],
    );
    const offending = hits
      .split('\n')
      .filter(Boolean)
      // The wrapper itself is the only allowed caller.
      .filter((line) => !line.includes('src/modules/notifications/services/sendTransactionalEmail.ts'))
      // Test files that grep for the pattern as a string are allowed.
      .filter((line) => !/__tests__|\.test\.ts/.test(line));
    expect(offending).toEqual([]);
  });
});