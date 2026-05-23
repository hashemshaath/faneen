import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(__dirname, '../../');
const SCRIPT = resolve(ROOT, 'scripts/contracts-isolation-audit.mjs');

describe('contracts-isolation-audit.mjs (CT-13)', () => {
  it('script exists', () => {
    expect(existsSync(SCRIPT)).toBe(true);
  });

  const SCRIPT_SRC = readFileSync(SCRIPT, 'utf8');

  it('declares the canonical allowed contract service path', () => {
    expect(SCRIPT_SRC).toContain('src/modules/contracts/');
  });

  it('documents the leads/conversion lead-service exception', () => {
    expect(SCRIPT_SRC).toContain('src/modules/leads/services/conversion.ts');
  });

  it('enforces every contract-domain table', () => {
    for (const t of [
      'contracts',
      'contract_attachments',
      'contract_milestones',
      'contract_notes',
      'contract_measurements',
      'contract_templates',
      'contract_template_versions',
      'contract_template_sections',
      'contract_template_clauses',
      'contract_template_pricing_rules',
      'contract_template_required_fields',
      'contract_template_attachments',
      'contract_signatures',
      'contract_events',
      'contract_audit_logs',
      'installment_plans',
      'installment_payments',
    ]) {
      expect(SCRIPT_SRC).toContain(`"${t}"`);
    }
  });

  it('enforces the contract-attachments storage bucket (literal + constant)', () => {
    expect(SCRIPT_SRC).toContain('contract-attachments');
    expect(SCRIPT_SRC).toContain('CONTRACT_ATTACHMENTS_BUCKET');
  });

  it('enforces every contract-domain RPC', () => {
    for (const r of [
      'update_contract_draft_autosave',
      'search_contract_clients',
      'quick_resolve_contract_client',
      'list_client_sites_for_contract',
      'create_contract_from_template',
      'verify_contract_public',
      'recalc_contract_total',
      'get_contract_analytics_dashboard',
      'get_admin_contract_analytics_dashboard',
      'record_contract_pdf_export',
      'list_contract_pdf_exports',
      'admin_list_contract_pdf_exports',
      'admin_contract_pdf_exports_summary',
      'accept_contract',
      'send_contract_for_approval',
      'clone_contract_as_draft',
      'set_contract_execution_site',
      'link_lead_to_contract',
      'complete_contract_from_invitation',
      'prepare_contract_prefill_from_lead',
      'get_contract_source_lead_summary',
      'approve_contract_amendment',
      'reject_contract_amendment',
      'cancel_contract_amendment',
      'apply_contract_amendment',
    ]) {
      expect(SCRIPT_SRC).toContain(`"${r}"`);
    }
  });

  it('is wired into package.json as contracts-isolation-audit', () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
    expect(pkg.scripts['contracts-isolation-audit']).toBe(
      'node scripts/contracts-isolation-audit.mjs',
    );
  });

  it('is wired into the code-audit CI workflow', () => {
    const wf = readFileSync(
      resolve(ROOT, '.github/workflows/code-audit.yml'),
      'utf8',
    );
    expect(wf).toContain('Contracts Isolation Audit');
    expect(wf).toContain('node scripts/contracts-isolation-audit.mjs');
  });

  it('passes (exit 0) against the live source tree', () => {
    const out = execFileSync('node', [SCRIPT], { cwd: ROOT, encoding: 'utf8' });
    expect(out).toMatch(/No unauthorized direct contract-domain access found/);
  }, 30_000);
});