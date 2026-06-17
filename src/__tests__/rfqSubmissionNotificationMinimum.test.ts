import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const EDGE = join(ROOT, 'supabase/functions/submit-quote-request/index.ts');
const REGISTRY = join(ROOT, 'supabase/functions/_shared/transactional-email-templates/registry.ts');
const QUOTE_RECEIVED = join(ROOT, 'supabase/functions/_shared/transactional-email-templates/quote-received.tsx');
const ADMIN_TEMPLATE = join(ROOT, 'supabase/functions/_shared/transactional-email-templates/admin-new-quote-request.tsx');
const SEND_FN = join(ROOT, 'supabase/functions/send-transactional-email/index.ts');

const edgeSrc = readFileSync(EDGE, 'utf8');
const registrySrc = readFileSync(REGISTRY, 'utf8');
const sendSrc = readFileSync(SEND_FN, 'utf8');

describe('RFQ submission notification minimum', () => {
  it('quote-received template exists', () => {
    expect(existsSync(QUOTE_RECEIVED)).toBe(true);
  });

  it('admin-new-quote-request template exists', () => {
    expect(existsSync(ADMIN_TEMPLATE)).toBe(true);
  });

  it('templates are registered', () => {
    expect(registrySrc).toMatch(/'quote-received'\s*:/);
    expect(registrySrc).toMatch(/'admin-new-quote-request'\s*:/);
  });

  it('both templates are anon-allowed in send-transactional-email', () => {
    expect(sendSrc).toMatch(/'quote-received'/);
    expect(sendSrc).toMatch(/'admin-new-quote-request'/);
  });

  it('submit-quote-request invokes both templates', () => {
    expect(edgeSrc).toMatch(/templateName:\s*['"]quote-received['"]|'quote-received'/);
    expect(edgeSrc).toMatch(/templateName:\s*['"]admin-new-quote-request['"]|'admin-new-quote-request'/);
    expect(edgeSrc).toMatch(/send-transactional-email/);
  });

  it('keeps AUTO_MATCH_ON_SUBMISSION = false', () => {
    expect(edgeSrc).toMatch(/AUTO_MATCH_ON_SUBMISSION\s*=\s*false/);
  });

  it('does NOT send to providers or create provider leads', () => {
    expect(edgeSrc).not.toMatch(/provider_leads/);
    expect(edgeSrc).not.toMatch(/match-quote-request['"]\s*,\s*\{[^}]*\}\s*\)\s*;?\s*\}\s*catch[^}]*\}\s*[^i]/); // only inside AUTO_MATCH guard
    // matching invoke must remain gated by AUTO_MATCH_ON_SUBMISSION
    expect(edgeSrc).toMatch(/if\s*\(\s*AUTO_MATCH_ON_SUBMISSION\s*\)/);
  });

  it('does not send when validation fails (errors return before email block)', () => {
    // Email block must live after the insert success
    const emailIdx = edgeSrc.indexOf('quote-received');
    const insertIdx = edgeSrc.indexOf("from('quote_requests')");
    expect(insertIdx).toBeGreaterThan(-1);
    expect(emailIdx).toBeGreaterThan(insertIdx);
  });

  it('has a duplicate-email guard keyed by template + recipient', () => {
    expect(edgeSrc).toMatch(/alreadySent/);
    expect(edgeSrc).toMatch(/email_send_log/);
  });

  it('uses idempotency key derived from ref_id / quote_request id', () => {
    expect(edgeSrc).toMatch(/idempotencyKey:\s*`quote-\$\{(refId|inserted)/);
  });

  it('send-transactional-email logs provider=resend and provider_id', () => {
    expect(sendSrc).toMatch(/provider:\s*['"]resend['"]/);
    expect(sendSrc).toMatch(/provider_id/);
  });

  it('does not log secrets/tokens/raw payloads in submit-quote-request email block', () => {
    expect(edgeSrc).not.toMatch(/Authorization.*templateData/s);
    expect(edgeSrc).not.toMatch(/RESEND_API_KEY/);
    expect(edgeSrc).not.toMatch(/SERVICE_ROLE.*templateData/);
  });

  it('no DB/RLS/RPC/migration touched for this feature (no SQL in edge)', () => {
    expect(edgeSrc).not.toMatch(/\bCREATE\s+(TABLE|POLICY|FUNCTION)\b/i);
    expect(edgeSrc).not.toMatch(/\bALTER\s+TABLE\b/i);
  });

  it('no hardcoded hex colors / forbidden TS escape hatches', () => {
    const files = [edgeSrc, readFileSync(QUOTE_RECEIVED, 'utf8'), readFileSync(ADMIN_TEMPLATE, 'utf8')];
    for (const src of files) {
      expect(src).not.toMatch(/#[0-9a-fA-F]{6}\b/);
      expect(src).not.toMatch(/\bas\s+any\b|@ts-ignore|@ts-expect-error|eslint-disable/);
    }
  });
});