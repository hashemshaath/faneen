/**
 * PROVIDER INTAKE TEMPLATE DOWNLOAD FINAL QA
 * Guards the no-navigation download flow + template column contracts.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as XLSX from 'xlsx';

const guideSrc = readFileSync(
  resolve(__dirname, '../components/admin/provider-intake/IntakeWizardGuide.tsx'),
  'utf8',
);

const PROVIDER_PATH = resolve(__dirname, '../../public/templates/qitaat-provider-intake-template.xlsx');
const BRANCH_PATH = resolve(__dirname, '../../public/templates/qitaat-provider-branches-template.xlsx');

const PROVIDER_COLS = [
  'company_name_ar','company_name_en','unified_number','commercial_registration',
  'established_year','sector','services','phone','email','country','region','city',
  'district','national_short_address','street_address','latitude','longitude',
  'google_maps_url','account_manager_name','account_manager_email',
  'account_manager_phone','contact_role','website','instagram','x_account',
  'linkedin','source','notes',
];

const BRANCH_COLS = [
  'company_name_ar','unified_number','commercial_registration','branch_name_ar',
  'branch_name_en','country','region','city','district','national_short_address',
  'street_address','latitude','longitude','google_maps_url','branch_phone',
  'branch_email','is_primary_branch','working_hours','branch_notes',
];

function readHeaderRow(xlsxPath: string): string[] {
  const buf = readFileSync(xlsxPath);
  const wb = XLSX.read(buf, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, blankrows: false });
  return (rows[0] ?? []).map((v) => String(v));
}

describe('Provider intake template download — Final QA', () => {
  it('uses fetch + Blob + temporary download link', () => {
    expect(guideSrc).toMatch(/await\s+fetch\(/);
    expect(guideSrc).toMatch(/await\s+res\.blob\(\)/);
    expect(guideSrc).toMatch(/URL\.createObjectURL\(/);
    expect(guideSrc).toMatch(/a\.download\s*=/);
    expect(guideSrc).toMatch(/URL\.revokeObjectURL\(/);
  });

  it('never navigates: no window.location and no window.open in download path', () => {
    expect(guideSrc).not.toMatch(/window\.location/);
    expect(guideSrc).not.toMatch(/window\.open\(/);
    expect(guideSrc).not.toMatch(/location\.assign\(/);
    expect(guideSrc).not.toMatch(/location\.href\s*=/);
  });

  it('uses buttons instead of navigable anchors for templates', () => {
    const templatesBlock = guideSrc.split('TEMPLATES.map')[1] ?? '';
    expect(templatesBlock).toMatch(/<button/);
    expect(templatesBlock).not.toMatch(/<a\b/);
    expect(templatesBlock).not.toMatch(/href=/);
    expect(templatesBlock).not.toMatch(/download\b/);
  });

  it('does not use target="_blank" on template controls', () => {
    const templatesBlock = guideSrc.split('TEMPLATES.map')[1] ?? '';
    expect(templatesBlock).not.toMatch(/target=\s*["']_blank["']/);
  });

  it('renders both template buttons with the expected filenames', () => {
    expect(guideSrc).toMatch(/qitaat-provider-intake-template\.xlsx/);
    expect(guideSrc).toMatch(/qitaat-provider-branches-template\.xlsx/);
    expect(guideSrc).toMatch(/data-testid=\{`intake-template-\$\{t\.id\}`\}/);
  });

  it('provider template file exists and has all required columns', () => {
    expect(existsSync(PROVIDER_PATH)).toBe(true);
    const headers = readHeaderRow(PROVIDER_PATH);
    for (const col of PROVIDER_COLS) {
      expect(headers, `missing provider column: ${col}`).toContain(col);
    }
  });

  it('branches template file exists and has all required columns', () => {
    expect(existsSync(BRANCH_PATH)).toBe(true);
    const headers = readHeaderRow(BRANCH_PATH);
    for (const col of BRANCH_COLS) {
      expect(headers, `missing branch column: ${col}`).toContain(col);
    }
  });

  it('no DB / RLS / migrations / RPC / edge touched by this component', () => {
    expect(guideSrc).not.toMatch(/from\s+['"]@\/integrations\/supabase\/client['"]/);
    expect(guideSrc).not.toMatch(/supabase\.from\(/);
    expect(guideSrc).not.toMatch(/supabase\.rpc\(/);
    expect(guideSrc).not.toMatch(/functions\.invoke\(/);
  });

  it('no direct businesses import, no auto-publish, no auto-match/send/lead', () => {
    // The component is allowed to mention "businesses table" in user-facing
    // copy — what's forbidden is importing/writing to that table.
    expect(guideSrc).not.toMatch(/from\s+['"][^'"]*businesses[^'"]*['"]/);
    expect(guideSrc).not.toMatch(/\.from\(['"]businesses['"]\)/);
    expect(guideSrc).not.toMatch(/auto[_-]?publish/i);
    expect(guideSrc).not.toMatch(/auto[_-]?match/i);
    expect(guideSrc).not.toMatch(/auto[_-]?send/i);
    expect(guideSrc).not.toMatch(/provider[_-]?lead/i);
  });

  it('no hex literals and no type/lint suppressions', () => {
    expect(guideSrc).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(guideSrc).not.toMatch(/\bany\b/);
    expect(guideSrc).not.toMatch(/@ts-(ignore|expect-error|nocheck)/);
    expect(guideSrc).not.toMatch(/eslint-disable(?!-next-line no-console)/);
  });
});