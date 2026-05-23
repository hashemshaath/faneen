import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(__dirname, '../../');
const SCRIPT = resolve(ROOT, 'scripts/leads-quotes-isolation-audit.mjs');
const SCRIPT_SRC = readFileSync(SCRIPT, 'utf8');

describe('leads-quotes-isolation-audit.mjs', () => {
  it('declares the expected allowed production paths', () => {
    for (const p of [
      'src/modules/leads/services/',
      'src/modules/quotes/services/',
      'src/modules/contracts/services/',
      'src/lib/quoteRequests.ts',
      'src/modules/leads/constants/storage.ts',
    ]) {
      expect(SCRIPT_SRC).toContain(p);
    }
  });

  it('enforces all six lead/quote tables', () => {
    for (const t of [
      'lead_requests',
      'quote_requests',
      'quote_request_files',
      'quote_request_leads',
      'quote_request_events',
      'quote_request_lead_events',
    ]) {
      expect(SCRIPT_SRC).toContain(`"${t}"`);
    }
  });

  it('enforces RPC and edge function names', () => {
    for (const name of [
      'create_or_get_lead_conversation',
      'admin_convert_lead_to_contract',
      'prepare_contract_prefill_from_lead',
      'get_contract_source_lead_summary',
      'link_lead_to_contract',
      'submit-quote-request',
      'notify-customer-lead-update',
      'notify-supplier-lead',
      'admin-reveal-lead-contact',
      'match-quote-request',
    ]) {
      expect(SCRIPT_SRC).toContain(name);
    }
  });

  it('enforces the quote-request-files storage bucket', () => {
    expect(SCRIPT_SRC).toContain('quote-request-files');
    expect(SCRIPT_SRC).toMatch(/QUOTE_BUCKET/);
  });

  it('currently passes (exit 0) against the live source tree', () => {
    // Throws if non-zero exit
    const out = execFileSync('node', [SCRIPT], { cwd: ROOT, encoding: 'utf8' });
    expect(out).toMatch(/No unauthorized direct lead\/quote access found/);
  }, 30_000);
});