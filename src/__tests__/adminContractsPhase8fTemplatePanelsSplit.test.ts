import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const PANELS_DIR = join(ROOT, 'src/components/admin/contract-templates/panels');
const EDITOR_PANELS = join(ROOT, 'src/components/admin/contract-templates/EditorPanels.tsx');
const ADMIN_TEMPLATES = join(ROOT, 'src/pages/admin/AdminContractTemplates.tsx');
const APP_TSX = join(ROOT, 'src/App.tsx');
const TYPES_FILE = join(ROOT, 'src/components/admin/contract-templates/types.ts');

const FORBIDDEN_BAD_TYPES = [
  /\bas\s+any\b/,
  /:\s*any\b/,
  /@ts-ignore/,
  /@ts-expect-error/,
  /eslint-disable/,
];

function readPanel(name: string): string {
  return readFileSync(join(PANELS_DIR, name), 'utf8');
}

function listPanels(): string[] {
  return readdirSync(PANELS_DIR).filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'));
}

describe('Phase 8F — Contract Templates Editor Panels Split', () => {
  it('1. EditorPanels.tsx uses the new panel components', () => {
    const src = readFileSync(EDITOR_PANELS, 'utf8');
    expect(src).toMatch(/TemplateSectionsClausesPanel/);
    expect(src).toMatch(/TemplatePricingRulesPanel/);
    expect(src).toMatch(/TemplateRequiredFieldsPanel/);
    expect(src).toMatch(/TemplateAttachmentsPanel/);
    expect(src).toMatch(/TemplatePreviewPanel/);
    expect(src).toMatch(/from '\.\/panels'/);
  });

  it('2. new panel components do not import Supabase', () => {
    for (const f of listPanels()) {
      const src = readPanel(f);
      expect(src, f).not.toMatch(/@\/integrations\/supabase/);
      expect(src, f).not.toMatch(/from ['"]@supabase/);
    }
  });

  it('3. new panel components contain no react-query queries', () => {
    for (const f of listPanels()) {
      const src = readPanel(f);
      expect(src, f).not.toMatch(/\buseQuery\b/);
      expect(src, f).not.toMatch(/\buseInfiniteQuery\b/);
    }
  });

  it('4. new panel components contain no mutations', () => {
    for (const f of listPanels()) {
      const src = readPanel(f);
      expect(src, f).not.toMatch(/\buseMutation\b/);
      expect(src, f).not.toMatch(/\buseQueryClient\b/);
    }
  });

  it('5. new panel components do not import contract template service writers', () => {
    const FORBIDDEN_IMPORTS = [
      /from ['"]@\/modules\/contracts['"]/,
      /createContractTemplateSection/,
      /updateContractTemplateSection/,
      /deleteContractTemplateSection/,
      /createContractTemplateClause/,
      /createContractTemplatePricingRule/,
      /createContractTemplateRequiredField/,
      /createContractTemplateAttachment/,
    ];
    for (const f of listPanels()) {
      const src = readPanel(f);
      for (const pat of FORBIDDEN_IMPORTS) {
        expect(src, `${f} :: ${pat}`).not.toMatch(pat);
      }
    }
  });

  it('6. no hardcoded hex colors in new panels', () => {
    for (const f of listPanels()) {
      const src = readPanel(f);
      expect(src, f).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });

  it('7. no forbidden type escapes in new panels', () => {
    for (const f of listPanels()) {
      const src = readPanel(f);
      for (const pat of FORBIDDEN_BAD_TYPES) {
        expect(src, `${f} :: ${pat}`).not.toMatch(pat);
      }
    }
  });

  it('8. VERSION_STATUS_META is unchanged', () => {
    const src = readFileSync(TYPES_FILE, 'utf8');
    expect(src).toMatch(/export const VERSION_STATUS_META/);
    for (const key of ['draft','in_review','changes_requested','legal_approved','published','archived','superseded']) {
      expect(src, key).toContain(`${key}:`);
    }
  });

  it('9. template mutation names remain in EditorPanels.tsx (parent)', () => {
    const src = readFileSync(EDITOR_PANELS, 'utf8');
    for (const name of [
      'createContractTemplateSection',
      'updateContractTemplateSection',
      'deleteContractTemplateSection',
      'createContractTemplateClause',
      'updateContractTemplateClause',
      'deleteContractTemplateClause',
      'createContractTemplatePricingRule',
      'updateContractTemplatePricingRule',
      'deleteContractTemplatePricingRule',
      'createContractTemplateRequiredField',
      'updateContractTemplateRequiredField',
      'deleteContractTemplateRequiredField',
      'createContractTemplateAttachment',
      'updateContractTemplateAttachment',
      'deleteContractTemplateAttachment',
    ]) {
      expect(src, name).toContain(name);
    }
  });

  it('10. PDF/QR/hash/signature files untouched by new panels', () => {
    for (const f of listPanels()) {
      const src = readPanel(f);
      expect(src, f).not.toMatch(/jspdf|qrcode|sha256|signContract|signature/i);
    }
  });

  it('11. App.tsx legacy contract template redirects unchanged (file exists)', () => {
    const src = readFileSync(APP_TSX, 'utf8');
    // Sanity: AdminContractTemplates page still wired in routing.
    expect(src).toMatch(/AdminContractTemplates|contract-templates/);
    // AdminContractTemplates.tsx still references the original public Panel names.
    const page = readFileSync(ADMIN_TEMPLATES, 'utf8');
    expect(page).toMatch(/SectionsClausesPanel/);
    expect(page).toMatch(/PricingRulesPanel/);
    expect(page).toMatch(/RequiredFieldsPanel/);
    expect(page).toMatch(/AttachmentsPanel/);
    expect(page).toMatch(/PreviewPanel/);
  });
});