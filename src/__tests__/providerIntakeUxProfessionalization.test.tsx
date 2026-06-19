/**
 * PROVIDER INTAKE UX PROFESSIONALIZATION — Architecture / surface guards.
 *
 * Runs as a static source audit (no React render) to keep the suite fast
 * and deterministic. Confirms that the three existing admin routes are
 * the ones being upgraded and that none of the forbidden behaviours
 * leaked in (no new /admin/provider-intake page, no DB migration, no
 * auto-dispatch, no hardcoded hex colours, no `as any` suppressions).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');
const exists = (p: string) => existsSync(join(ROOT, p));

const PAGES = {
  enrichment: 'src/pages/admin/AdminDataEnrichment.tsx',
  leads: 'src/pages/admin/AdminProviderLeads.tsx',
  queue: 'src/pages/admin/AdminProviderGrowthQueue.tsx',
};

const SHARED = {
  template: 'src/components/admin/provider-intake/PilotContactTemplateCard.tsx',
  kpis: 'src/components/admin/provider-intake/IntakeKpiStrip.tsx',
  guide: 'src/components/admin/provider-intake/IntakeWizardGuide.tsx',
};

const ALL_FILES = [...Object.values(PAGES), ...Object.values(SHARED)];

describe('PROVIDER INTAKE UX PROFESSIONALIZATION', () => {
  it('keeps the three existing admin routes registered (no new /admin/provider-intake)', () => {
    const app = read('src/App.tsx');
    expect(app).toMatch(/path="\/admin\/data-enrichment"/);
    expect(app).toMatch(/path="\/admin\/provider-leads"/);
    expect(app).toMatch(/path="\/admin\/provider-growth\/queue"/);
    expect(app).not.toMatch(/path="\/admin\/provider-intake"/);
    expect(exists('src/pages/admin/AdminProviderIntake.tsx')).toBe(false);
    expect(exists('src/pages/admin/ProviderIntake.tsx')).toBe(false);
  });

  it('AdminDataEnrichment renders a wizard guide with the four operational steps', () => {
    const src = read(PAGES.enrichment);
    expect(src).toMatch(/IntakeWizardGuide/);
    const guide = read(SHARED.guide);
    for (const step of ['upload', 'map', 'review', 'apply']) {
      expect(guide).toMatch(new RegExp(`id:\\s*'${step}'`));
    }
  });

  it('duplicate badges legend exposes the required tones', () => {
    const guide = read(SHARED.guide);
    for (const id of ['new', 'strong-duplicate', 'possible-similar', 'needs-review', 'missing-data']) {
      expect(guide).toMatch(new RegExp(`duplicate-badge-${id}`));
    }
  });

  it('original + normalized preview surfaces are still rendered on enrichment', () => {
    const src = read(PAGES.enrichment);
    // The existing wizard already shows source-vs-suggested comparison
    // through the review step + conflict alert; both must remain wired.
    expect(src).toMatch(/step === "review"/);
    expect(src).toMatch(/conflictKeys/);
  });

  it('AdminProviderLeads exposes KPI strip with the six readiness counters', () => {
    const src = read(PAGES.leads);
    expect(src).toMatch(/IntakeKpiStrip/);
    for (const id of ['total', 'ready-review', 'needs-data', 'ready-convert', 'converted', 'rejected']) {
      expect(src).toMatch(new RegExp(`id:\\s*'${id}'`));
    }
    // Status + search filters were already present and must remain.
    expect(src).toMatch(/STATUS_LABEL/);
    expect(src).toMatch(/setFilter\(/);
  });

  it('AdminProviderGrowthQueue exposes pilot-readiness KPIs', () => {
    const src = read(PAGES.queue);
    expect(src).toMatch(/IntakeKpiStrip/);
    for (const id of ['ready-pilot', 'needs-contact', 'awaiting-reply', 'missing-services', 'missing-city', 'out-of-scope', 'total']) {
      expect(src).toMatch(new RegExp(`id:\\s*'${id}'`));
    }
    // Existing growth queue filters must remain.
    expect(src).toMatch(/queue-filters/);
  });

  it('approved pilot contact template + copy button are mounted on both lead surfaces', () => {
    const tpl = read(SHARED.template);
    expect(tpl).toMatch(/PILOT_CONTACT_TEMPLATE_AR/);
    expect(tpl).toMatch(/PILOT_CONTACT_TEMPLATE_EN/);
    expect(tpl).toMatch(/navigator\.clipboard\.writeText/);
    expect(tpl).toMatch(/منصة قطاعات/);
    expect(tpl).toMatch(/Qitaat/);

    expect(read(PAGES.leads)).toMatch(/PilotContactTemplateCard/);
    expect(read(PAGES.queue)).toMatch(/PilotContactTemplateCard/);
    expect(read(PAGES.enrichment)).toMatch(/PilotContactTemplateCard/);
  });

  it('does not auto-dispatch, auto-publish, auto-match, or write businesses from these surfaces', () => {
    const forbidden = [
      /sendProviderEmail/i,
      /dispatchProvider/i,
      /autoMatch/i,
      /auto[_-]?publish/i,
      /createProviderLeadAutomatic/i,
      /from\(['"]businesses['"]\)\s*\.\s*insert/,
    ];
    for (const file of ALL_FILES) {
      const src = read(file);
      for (const pattern of forbidden) {
        expect(src, `${file} must not contain ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it('no hardcoded hex colours or suppressions in new intake components', () => {
    const hex = /#[0-9a-fA-F]{3,8}\b/;
    const suppressions = /(\bas\s+any\b|@ts-(ignore|nocheck)|eslint-disable)/;
    for (const file of Object.values(SHARED)) {
      const src = read(file);
      expect(src, `${file} must not contain hex colours`).not.toMatch(hex);
      expect(src, `${file} must not contain suppressions`).not.toMatch(suppressions);
    }
  });

  it('no new DB migration was added for this sprint', () => {
    const migrations = readdirSync(join(ROOT, 'supabase/migrations')).filter((f) =>
      statSync(join(ROOT, 'supabase/migrations', f)).isFile(),
    );
    const intakeMig = migrations.find((m) => /provider[_-]?intake|pilot[_-]?readiness/i.test(m));
    expect(intakeMig).toBeUndefined();
  });
});