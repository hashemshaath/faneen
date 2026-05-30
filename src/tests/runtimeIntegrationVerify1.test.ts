/**
 * RUNTIME-INTEGRATION-VERIFY-1
 *
 * Presence + scope guards for the runtime verification loop. Confirms the
 * five audit artifacts are committed, every required event row is present
 * in the runtime event matrix, and that no out-of-scope module (inventory,
 * accounting, supplier portal, WhatsApp/SMS) snuck in.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf8');
const exists = (p: string) => existsSync(resolve(ROOT, p));

function walkSrc(): string[] {
  const out: string[] = [];
  const stack = [resolve(ROOT, 'src')];
  while (stack.length) {
    const dir = stack.pop()!;
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        if (entry === 'node_modules' || entry.startsWith('.')) continue;
        stack.push(full);
      } else if (/\.(ts|tsx)$/.test(entry)) {
        out.push(full);
      }
    }
  }
  return out;
}

describe('RUNTIME-INTEGRATION-VERIFY-1 — Parts A–I', () => {
  it('Part A — runtime event flow audit exists with every required event', () => {
    expect(exists('docs/runtime-event-flow-audit.md')).toBe(true);
    const body = read('docs/runtime-event-flow-audit.md');
    for (const ev of [
      'quotation.created',
      'quotation.sent',
      'quotation.approved',
      'quotation.expired',
      'contract.drafted',
      'contract.approved',
      'work_order.created',
      'work_order.assigned',
      'work_order.completed',
      'installation.scheduled',
      'installation.confirmed',
      'installation.completed',
      'project.completed',
      'project.confirmed',
      'warranty.started',
      'customer.nps_submitted',
    ]) {
      expect(body, `missing event ${ev}`).toContain(ev);
    }
  });

  it('Part C — customer runtime verification doc exists', () => {
    expect(exists('docs/customer-runtime-verification.md')).toBe(true);
    const body = read('docs/customer-runtime-verification.md');
    for (const flow of [
      'Tracking link open',
      'Installation confirmation',
      'Project completion confirm',
      'Feedback submission',
      'NPS submission',
      'Warranty follow-up',
    ]) {
      expect(body).toContain(flow);
    }
  });

  it('Part D — operations runtime verification doc exists', () => {
    expect(exists('docs/operations-runtime-verification.md')).toBe(true);
    const body = read('docs/operations-runtime-verification.md');
    for (const surface of [
      'Health score',
      'Alert creation',
      'Observability history',
      'Manual health check',
      'Integrity diagnostics',
    ]) {
      expect(body).toContain(surface);
    }
  });

  it('Part E — reference runtime verification doc covers every active prefix', () => {
    expect(exists('docs/reference-runtime-verification.md')).toBe(true);
    const body = read('docs/reference-runtime-verification.md');
    for (const prefix of [
      'RFQ',
      'QTE',
      'CONTRACT',
      'WO',
      'BOQ',
      'PO',
      'CTL',
      'CPN',
      'CLS',
      'WAR',
      'FDB',
      'APT',
    ]) {
      expect(body, `missing prefix ${prefix}`).toContain(prefix);
    }
  });

  it('Part F — notification runtime coverage matrix exists', () => {
    expect(exists('docs/notification-runtime-coverage.md')).toBe(true);
    const body = read('docs/notification-runtime-coverage.md');
    expect(body).toContain('Silent failures detected');
    expect(body).toContain('Help coverage');
  });

  it('Part G — observability module surface unchanged', () => {
    expect(exists('src/modules/observability/index.ts')).toBe(true);
    const body = read('src/modules/observability/index.ts');
    expect(body).toContain("./health");
    expect(body).toContain("./diagnostics");
    expect(body).toContain("./alerts");
  });

  it('Part H scope guard — no inventory / accounting / supplier-portal modules', () => {
    const forbiddenDirs = [
      'src/modules/inventory',
      'src/modules/accounting',
      'src/modules/supplier-portal',
      'src/modules/supplierPortal',
    ];
    for (const dir of forbiddenDirs) {
      expect(exists(dir), `forbidden module dir ${dir}`).toBe(false);
    }
  });

  it('Part H scope guard — no WhatsApp/SMS imports in client code', () => {
    const forbidden = [
      /from\s+['"]twilio['"]/,
      /from\s+['"]@twilio\//,
      /from\s+['"]whatsapp-web/,
      /from\s+['"]@capacitor\//,
    ];
    const offenders: string[] = [];
    for (const file of walkSrc()) {
      const body = readFileSync(file, 'utf8');
      if (forbidden.some((rx) => rx.test(body))) offenders.push(file);
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});