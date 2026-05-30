/**
 * BUSINESS-HARDENING-1
 *
 * Scope guards + presence guards for the approved hardening loop.
 * Forbids new inventory / accounting / supplier-payments / WhatsApp /
 * SMS / mobile / supplier-portal code from sneaking in. Ensures the
 * hardening doc + backlog entries exist and the contextual-help
 * mappings added in the previous loop are still wired.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { contextualHelpRegistry } from '@/modules/helpCenter/contextualHelp';

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

describe('BUSINESS-HARDENING-1 — Part I & J guards', () => {
  it('hardening doc exists with all 8 parts', () => {
    expect(exists('docs/business-hardening-1.md')).toBe(true);
    const body = read('docs/business-hardening-1.md');
    for (const part of [
      'Part A — NPS submitted',
      'Part B — `work_order_assigned`',
      'Part C — `quote_expired`',
      'Part D — Closure → NPS request',
      'Part E — Warranty resolved → NPS follow-up',
      'Part F — BOQ → Procurement hardening',
      'Part G — Purchase Order hardening',
      'Part H — Observability coverage',
    ]) {
      expect(body, `missing ${part}`).toContain(part);
    }
  });

  it('pilot backlog lists every HARDENING-1 follow-through ticket', () => {
    const body = read('docs/pilot-launch-backlog.md');
    for (const id of [
      'HARDENING-1-A',
      'HARDENING-1-B',
      'HARDENING-1-C',
      'HARDENING-1-D',
      'HARDENING-1-E',
      'HARDENING-1-F',
      'HARDENING-1-G',
      'HARDENING-1-H',
    ]) {
      expect(body, `missing backlog id ${id}`).toContain(id);
    }
  });

  it('contextual help mappings from the previous audit are preserved', () => {
    for (const key of [
      'dashboard.customer-experience',
      'dashboard.installations',
      'dashboard.closures',
      'dashboard.feedback',
      'customer.warranty-claim',
    ]) {
      expect(contextualHelpRegistry[key], `missing ${key}`).toBeDefined();
    }
  });

  it('scope guard: no new inventory module folder', () => {
    expect(exists('src/modules/inventory')).toBe(false);
  });

  it('scope guard: no new accounting module folder', () => {
    expect(exists('src/modules/accounting')).toBe(false);
  });

  it('scope guard: no new supplier-payments module folder', () => {
    expect(exists('src/modules/supplierPayments')).toBe(false);
    expect(exists('src/modules/supplier-payments')).toBe(false);
  });

  it('scope guard: no public supplier-portal route file', () => {
    expect(exists('src/pages/SupplierPortal.tsx')).toBe(false);
    expect(exists('src/pages/supplier')).toBe(false);
  });

  it('scope guard: no WhatsApp / SMS / mobile native scaffolding introduced', () => {
    const banned = [
      /from\s+['"]twilio['"]/,
      /from\s+['"]@twilio\//,
      /whatsapp[-_]?send/i,
      /sms[-_]?send/i,
      /Capacitor\.registerPlugin/i,
    ];
    const offenders: string[] = [];
    for (const file of walkSrc()) {
      // skip test files and audit fixtures themselves
      if (/__tests__|\.test\.tsx?$/.test(file)) continue;
      if (/businessHardening1\.test\.ts$/.test(file)) continue;
      const content = readFileSync(file, 'utf8');
      for (const re of banned) {
        if (re.test(content)) {
          offenders.push(`${file} matched ${re}`);
          break;
        }
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('scope guard: hardening doc explicitly forbids the out-of-scope domains', () => {
    const body = read('docs/business-hardening-1.md');
    for (const term of [
      'inventory',
      'accounting',
      'supplier payments',
      'supplier portal',
      'WhatsApp',
      'SMS',
      'mobile',
    ]) {
      expect(body.toLowerCase()).toContain(term.toLowerCase());
    }
  });

  it('PO hardening: scorecard keeps Purchase Orders flagged Needs Rebuild', () => {
    const body = read('docs/system-health-scorecard.md');
    expect(body).toMatch(/Purchase Orders\s*\|\s*45\s*\|\s*Needs Rebuild/);
  });

  it('observability guard: notification coverage audit names every new event family', () => {
    const body = read('docs/business-hardening-1.md');
    for (const evt of [
      'nps_submitted',
      'work-order-assigned',
      'quote_expired',
      'nps_request_pending',
      'nps_followup_pending',
      'skipped_no_recipients',
    ]) {
      expect(body, `missing event ${evt}`).toContain(evt);
    }
  });

  it('idempotency contract documented for closure and warranty follow-up', () => {
    const body = read('docs/business-hardening-1.md');
    expect(body).toMatch(/Idempotent/i);
    expect(body).toMatch(/contract_id.*nps_request|nps_request.*contract_id/);
    expect(body).toMatch(/90[- ]day/);
  });

  it('BOQ → Procurement remains manual (no auto-creation)', () => {
    const body = read('docs/business-hardening-1.md');
    expect(body).toMatch(/no cron auto-creation|Manual trigger only/i);
  });
});