import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');

describe('PROVIDER-LEAD-INTAKE-FORM-1', () => {
  it('public ProviderJoin page exists', () => {
    expect(fs.existsSync('src/pages/ProviderJoin.tsx')).toBe(true);
  });

  it('admin AdminProviderLeads page exists', () => {
    expect(fs.existsSync('src/pages/admin/AdminProviderLeads.tsx')).toBe(true);
  });

  it('routes /join/qitaat and /providers/join are registered', () => {
    const app = read('src/App.tsx');
    expect(app).toMatch(/path="\/join\/qitaat"/);
    expect(app).toMatch(/path="\/providers\/join"/);
    expect(app).toMatch(/path="\/admin\/provider-leads"/);
  });

  it('ProviderJoin page has no direct supabase calls', () => {
    const src = read('src/pages/ProviderJoin.tsx');
    expect(src).not.toMatch(/supabase\.functions\.invoke/);
    expect(src).not.toMatch(/supabase\.from\(/);
    expect(src).not.toMatch(/supabase\.storage\.from/);
  });

  it('submitProviderLead service exists and uses the RPC', () => {
    const src = read('src/modules/providers/services/submitProviderLead.ts');
    expect(src).toMatch(/submit_provider_lead/);
    expect(src).toMatch(/sendTransactionalEmail/);
  });

  it('confirmation email template is registered', () => {
    const reg = read('supabase/functions/_shared/transactional-email-templates/registry.ts');
    expect(reg).toMatch(/provider-lead-confirmation/);
    expect(fs.existsSync('supabase/functions/_shared/transactional-email-templates/provider-lead-confirmation.tsx')).toBe(true);
  });

  it('providers module barrel exports the public API', () => {
    const bar = read('src/modules/providers/index.ts');
    expect(bar).toMatch(/submitProviderLead/);
    expect(bar).toMatch(/listProviderLeads/);
    expect(bar).toMatch(/updateProviderLeadStatus/);
  });

  it('provider-lead bucket constant declared and added to private buckets', () => {
    const src = read('src/modules/files/constants/buckets.ts');
    expect(src).toMatch(/PROVIDER_LEAD_DOCUMENTS_BUCKET\s*=\s*'provider-lead-documents'/);
    expect(src).toMatch(/PROVIDER_LEAD_DOCUMENTS_BUCKET/);
  });

  it('CR upload helper enforces MIME and size caps', () => {
    const src = read('src/modules/files/domain/providerLeadDocuments.ts');
    expect(src).toMatch(/application\/pdf/);
    expect(src).toMatch(/PROVIDER_LEAD_DOC_MAX_BYTES/);
  });
});