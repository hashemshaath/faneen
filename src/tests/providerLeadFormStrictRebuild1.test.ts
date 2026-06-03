import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');
const exists = (p: string) => fs.existsSync(path.join(process.cwd(), p));

const ROOT = 'src/pages/providerJoin/rebuild';

describe('PROVIDER-LEAD-FORM-STRICT-REBUILD-1 — 4 steps', () => {
  it('rebuild folder exists with separate types/constants/validation/service files', () => {
    expect(exists(`${ROOT}/types.ts`)).toBe(true);
    expect(exists(`${ROOT}/constants.ts`)).toBe(true);
    expect(exists(`${ROOT}/validation.ts`)).toBe(true);
    expect(exists(`${ROOT}/services/submitProviderLead.ts`)).toBe(true);
  });

  it('exposes exactly 4 steps in constants', () => {
    const src = read(`${ROOT}/constants.ts`);
    // STEPS array literal must contain 4 step entries (id: 1..4)
    expect(src).toMatch(/id:\s*1/);
    expect(src).toMatch(/id:\s*2/);
    expect(src).toMatch(/id:\s*3/);
    expect(src).toMatch(/id:\s*4/);
    expect(src).not.toMatch(/id:\s*5/);
  });

  it('each step file is split by information type', () => {
    expect(exists(`${ROOT}/steps/BusinessAndServicesStep.tsx`)).toBe(true);
    expect(exists(`${ROOT}/steps/ContactAndLocationStep.tsx`)).toBe(true);
    expect(exists(`${ROOT}/steps/OfficialAndBranchesStep.tsx`)).toBe(true);
    expect(exists(`${ROOT}/steps/ReviewSubmitStep.tsx`)).toBe(true);
  });

  it('required compact components exist', () => {
    expect(exists(`${ROOT}/components/CompactInput.tsx`)).toBe(true);
    expect(exists(`${ROOT}/components/CompactTextarea.tsx`)).toBe(true);
    expect(exists(`${ROOT}/components/CompactFileUpload.tsx`)).toBe(true);
    expect(exists(`${ROOT}/components/ServiceChipSelector.tsx`)).toBe(true);
    expect(exists(`${ROOT}/components/BranchAccordionCard.tsx`)).toBe(true);
    expect(exists(`${ROOT}/components/ProviderLeadStepper.tsx`)).toBe(true);
    expect(exists(`${ROOT}/components/FormBottomBar.tsx`)).toBe(true);
  });

  it('ProviderJoin page has no direct supabase calls', () => {
    const src = read('src/pages/ProviderJoin.tsx');
    expect(src).not.toMatch(/supabase\.functions\.invoke/);
    expect(src).not.toMatch(/supabase\.from\(/);
    expect(src).not.toMatch(/supabase\.storage\.from/);
    expect(src).not.toMatch(/from ['"]@\/integrations\/supabase/);
  });

  it('ProviderLeadFormPage does not call Supabase directly', () => {
    const src = read(`${ROOT}/ProviderLeadFormPage.tsx`);
    expect(src).not.toMatch(/supabase\.functions\.invoke/);
    expect(src).not.toMatch(/supabase\.from\(/);
    expect(src).not.toMatch(/supabase\.storage\.from/);
    expect(src).not.toMatch(/from ['"]@\/integrations\/supabase/);
  });

  it('uses RTL logical classes only (no pl/pr/ml/mr/text-left/text-right) in rebuild folder', () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) walk(full);
        else if (full.endsWith('.tsx') || full.endsWith('.ts')) files.push(full);
      }
    };
    walk(path.join(process.cwd(), ROOT));
    const bad = /(?:^|[\s"'`])(pl-\d|pr-\d|ml-\d|mr-\d|text-left|text-right)(?=$|[\s"'`])/;
    for (const f of files) {
      const content = fs.readFileSync(f, 'utf8');
      expect(bad.test(content), `${f} uses physical RTL class`).toBe(false);
    }
  });

  it('CompactFileUpload is accessible (aria-invalid + describedby)', () => {
    const src = read(`${ROOT}/components/CompactFileUpload.tsx`);
    expect(src).toMatch(/aria-invalid/);
    expect(src).toMatch(/aria-describedby/);
    expect(src).toMatch(/accept/);
  });

  it('duplicate guard handled via submit service error code', () => {
    const page = read(`${ROOT}/ProviderLeadFormPage.tsx`);
    expect(page).toMatch(/duplicate_request/);
  });

  it('email confirmation template still registered', () => {
    const reg = read('supabase/functions/_shared/transactional-email-templates/registry.ts');
    expect(reg).toMatch(/provider-lead-confirmation/);
  });

  it('admin notification kept via shared submit service', () => {
    const svc = read('src/modules/providers/services/submitProviderLead.ts');
    expect(svc).toMatch(/submit_provider_lead/);
    // Admin notification is dispatched by the SECURITY DEFINER RPC; the page never calls it directly.
    expect(svc).toMatch(/sendTransactionalEmail/);
  });

  it('route /join/qitaat is unchanged', () => {
    const app = read('src/App.tsx');
    expect(app).toMatch(/path="\/join\/qitaat"/);
    expect(app).toMatch(/path="\/providers\/join"/);
  });

  it('mobile container uses 420px max-width and 96px bottom padding', () => {
    const src = read(`${ROOT}/ProviderLeadFormPage.tsx`);
    expect(src).toMatch(/maxWidth:\s*420/);
    expect(src).toMatch(/paddingBottom:\s*96/);
  });

  it('does not auto-create an account or auto-publish a business', () => {
    const page = read(`${ROOT}/ProviderLeadFormPage.tsx`);
    expect(page).not.toMatch(/signUp|signInWithPassword|signInWithOtp/);
    expect(page).not.toMatch(/businesses['"]\)\s*\.\s*insert/);
  });
});