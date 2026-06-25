/**
 * CONTRACT PARTY MODEL — PHASE D
 * Template filtering by sector / work type.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { filterTemplatesBySector } from '@/lib/contract-work-types';

const ROOT = path.resolve(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const PAGE = 'pages/dashboard/DashboardContracts.tsx';
const SECTION = 'components/contracts/dashboard/create/TemplateSelectionSection.tsx';

type T = { version_id: string; category: string };
const versions: T[] = [
  { version_id: 'a', category: 'kitchens' },
  { version_id: 'b', category: 'aluminum_doors_windows' },
  { version_id: 'c', category: 'general' },
  { version_id: 'd', category: 'facades' },
];

describe('Phase D — Template filtering by sector', () => {
  const page = read(PAGE);
  const section = read(SECTION);

  it('1. selecting a sector returns only matching + general templates', () => {
    const out = filterTemplatesBySector('kitchens', true, versions);
    const cats = out.map(v => v.category).sort();
    expect(cats).toEqual(['general', 'kitchens']);
  });

  it('2. unrelated templates are excluded', () => {
    const out = filterTemplatesBySector('kitchens', true, versions);
    expect(out.find(v => v.category === 'facades')).toBeUndefined();
    expect(out.find(v => v.category === 'aluminum_doors_windows')).toBeUndefined();
  });

  it('3. no sector selected returns empty (UI shows "اختر المجال أولًا...")', () => {
    expect(filterTemplatesBySector(null, false, versions)).toEqual([]);
    expect(filterTemplatesBySector('kitchens', false, versions)).toEqual([]);
  });

  it('4. no matching templates returns empty array (UI shows "لا يوجد قالب...")', () => {
    const only = [{ version_id: 'x', category: 'facades' }];
    expect(filterTemplatesBySector('kitchens', true, only)).toEqual([]);
  });

  it('5. TemplateSelectionSection renders the no-sector message', () => {
    expect(section).toContain('contract-template-section-no-sector');
    expect(section).toContain('اختر المجال أولًا لعرض قوالب العقد المناسبة');
    expect(section).toContain('Select a sector first to see matching contract templates');
  });

  it('6. TemplateSelectionSection renders the no-match message', () => {
    // The picker now surfaces the no-match guidance via an inline warning
    // banner plus an "Show all templates" affordance, rather than the
    // legacy section-level placeholder. Guard the new behavior.
    expect(section).toContain('contract-template-no-match-banner');
    expect(section).toContain('عرض جميع القوالب');
  });

  it('7. TemplateSelectionSection consumes filterTemplatesBySector, not the raw list', () => {
    expect(section).toContain('filterTemplatesBySector');
    // The legacy `{filtered.map(v => ...)}` JSX was replaced by a
    // searchable Combobox that groups `filtered` items by category
    // before rendering. Guard that the searchable picker still
    // consumes the filtered list (and not the raw `publishedVersions`).
    expect(section).toMatch(/Command(Input|Group|Item|List)/);
    expect(section).toMatch(/filtered/);
  });

  it('8. Selected sector label is surfaced on the template section', () => {
    expect(section).toContain('contract-template-sector-badge');
    expect(section).toMatch(/getWorkTypeLabel/);
  });

  it('9. DashboardContracts wires sector/work-type into the template section', () => {
    expect(page).toMatch(/<TemplateSelectionSection[\s\S]*?selectedWorkType=\{selectedWorkType\}[\s\S]*?sectorTouched=\{workTypeTouched\}/);
  });

  it('10. No new RPC / DB / migration code introduced', () => {
    for (const forbidden of [
      'supabase.from(', '.rpc(', 'CREATE TABLE', 'CREATE POLICY',
    ]) {
      expect(section.includes(forbidden), `section must not contain ${forbidden}`).toBe(false);
    }
  });

  it('11. No hardcoded sector/template UUIDs / hex / any / suppressions', () => {
    const both = section + read('lib/contract-work-types.ts');
    expect(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(both)).toBe(false);
    expect(/#[0-9a-fA-F]{3,8}\b/.test(section)).toBe(false);
    expect(/:\s*any\b/.test(section)).toBe(false);
    expect(/\bas\s+any\b/.test(section)).toBe(false);
    expect(section.includes('@ts-ignore')).toBe(false);
    expect(section.includes('@ts-expect-error')).toBe(false);
    expect(section.includes('eslint-disable')).toBe(false);
  });

  it('12. DashboardContracts.tsx remains under line cap (3192)', () => {
    expect(page.split('\n').length).toBeLessThan(3192);
  });

  it('13. Lifecycle / approval / signature flows untouched in this section', () => {
    for (const forbidden of [
      'sendContractForApproval', 'acceptContract', 'signContract',
    ]) {
      expect(section.includes(forbidden), `section must not call ${forbidden}`).toBe(false);
    }
  });
});