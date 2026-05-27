/**
 * BUSINESS-OPERATIONS-2A — Architecture-only audit test.
 *
 * Verifies that the SLA / escalation design phase is *audit + design only*:
 * 1. The architecture doc exists and contains the required sections.
 * 2. No `operational_alerts` table, wrapper, or cron job has been added yet.
 * 3. No dispatch surface (email/notification) was wired to an SLA sweep.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(__dirname, '../..');
const DOC = resolve(ROOT, 'docs/business-operations-sla-escalation.md');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git' || name === 'dist' || name === 'build' || name === 'coverage' || name === '__tests__') continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

describe('BUSINESS-OPERATIONS-2A SLA architecture', () => {
  it('publishes the SLA / escalation design doc', () => {
    expect(existsSync(DOC)).toBe(true);
    const txt = readFileSync(DOC, 'utf-8');
    for (const section of [
      '## 1. SLA matrix',
      '## 2. Escalation levels',
      '## 3. Notification policy',
      '## 4. Automation design',
      '## 5. Data model proposal',
      '## 6. Admin UI proposal',
      '## 7. Safety constraints',
      '## 8. Risks',
      '## 9. Recommended implementation phases',
    ]) {
      expect(txt, `missing section: ${section}`).toContain(section);
    }
  });

  it('declares all required escalation levels L0..L3', () => {
    const txt = readFileSync(DOC, 'utf-8');
    for (const lvl of ['L0', 'L1', 'L2', 'L3']) {
      expect(txt).toContain(lvl);
    }
  });

  it('does not yet introduce an operational_alerts table or wrapper', () => {
    const src = resolve(ROOT, 'src');
    const supa = resolve(ROOT, 'supabase');
    const files = [...walk(src), ...walk(supa)];
    for (const f of files) {
      if (f.endsWith('.md')) continue;
      if (f.endsWith('business-operations-sla-escalation.md')) continue;
      if (f.endsWith('businessOperations2a.slaArchitecture.test.ts')) continue;
      const txt = readFileSync(f, 'utf-8');
      expect(txt.includes('operational_alerts'), `unexpected operational_alerts reference in ${f}`).toBe(false);
    }
  });

  it('does not yet wire an sla-sweep cron job', () => {
    const supa = resolve(ROOT, 'supabase');
    const src = resolve(ROOT, 'src');
    const files = [...walk(src), ...walk(supa)];
    for (const f of files) {
      if (f.endsWith('business-operations-sla-escalation.md')) continue;
      if (f.endsWith('businessOperations2a.slaArchitecture.test.ts')) continue;
      const txt = readFileSync(f, 'utf-8');
      expect(txt.includes("'sla-sweep'") || txt.includes('"sla-sweep"'),
        `unexpected sla-sweep cron wiring in ${f}`).toBe(false);
    }
  });
});