import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(__dirname, '../../');
const DOC = resolve(ROOT, 'docs/procurement-governance-audit-1.md');

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

describe('PROCUREMENT-GOVERNANCE-AUDIT-1', () => {
  it('audit document exists with all required deliverable sections', () => {
    expect(existsSync(DOC)).toBe(true);
    const src = readFileSync(DOC, 'utf8');
    for (const heading of [
      'A. Inventory',
      'B. Lifecycle map',
      'C. Ownership & approval matrix',
      'D. Quote comparison governance',
      'E. Purchase Order Maturity Scorecard',
      'F. Notification audit',
      'G. Integration audit',
      'H. Screen review',
      'I. Safe repairs applied',
      'J. Tests',
      'K. Validation',
    ]) {
      expect(src).toContain(heading);
    }
  });

  it('procurement module does not read roles from profiles (privilege escalation guard)', () => {
    const files = walk(resolve(ROOT, 'src/modules/procurement'));
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      expect(src).not.toMatch(/from\(['"]profiles['"]\)[^;]*\.(?:eq|select)\([^)]*['"](?:role|is_admin)['"]/);
    }
  });

  it('procurement module does not import WhatsApp/SMS SDKs (scope guard)', () => {
    const files = walk(resolve(ROOT, 'src/modules/procurement'));
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      expect(src).not.toMatch(/from\s+['"](?:twilio|@whiskeysockets\/baileys|whatsapp-web\.js)['"]/);
    }
  });

  it('procurement screens do not introduce Dialog/AlertDialog popups (no-popup policy)', () => {
    const dirs = [
      resolve(ROOT, 'src/modules/procurement/components'),
      resolve(ROOT, 'src/pages/dashboard/procurement'),
    ];
    for (const d of dirs) {
      for (const f of walk(d)) {
        const src = readFileSync(f, 'utf8');
        expect(src).not.toMatch(/from\s+['"]@\/components\/ui\/(?:dialog|alert-dialog)['"]/);
      }
    }
  });

  it('procurement isolation audit script remains wired (boundary intact)', () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
    expect(pkg.scripts['procurement-isolation-audit']).toBe(
      'node scripts/procurement-isolation-audit.mjs',
    );
    expect(existsSync(resolve(ROOT, 'scripts/procurement-isolation-audit.mjs'))).toBe(true);
  });

  it('canonical status registries remain the single source of truth', () => {
    const types = readFileSync(
      resolve(ROOT, 'src/modules/procurement/types.ts'),
      'utf8',
    );
    expect(types).toMatch(/ProcurementRfqStatus\s*=\s*'draft'\s*\|\s*'sent'\s*\|\s*'closed'\s*\|\s*'cancelled'/);
    expect(types).toMatch(/ProcurementPurchaseOrderStatus\s*=\s*'draft'\s*\|\s*'issued'\s*\|\s*'cancelled'/);
    expect(types).toContain('ProcurementSupplierQuoteStatus');
    expect(types).toContain('ProcurementInvitationStatus');
  });

  it('referenced governance docs all exist', () => {
    for (const rel of [
      'docs/contracts-governance-audit-1.md',
      'docs/system-maturity-matrix.md',
      'docs/notification-runtime-coverage.md',
      'docs/reference-runtime-verification.md',
      'docs/pilot-launch-backlog.md',
    ]) {
      expect(existsSync(resolve(ROOT, rel))).toBe(true);
    }
  });

  it('procurement module barrel exposes the documented surface', () => {
    const barrel = readFileSync(
      resolve(ROOT, 'src/modules/procurement/index.ts'),
      'utf8',
    );
    for (const sym of [
      'createProcurementRequest',
      'createRfqFromRequest',
      'sendRfq',
      'closeRfq',
      'awardRfqQuote',
      'submitSupplierQuote',
      'shortlistQuote',
      'rejectQuote',
      'compareSupplierQuotes',
      'evaluateAwardEligibility',
    ]) {
      expect(barrel).toContain(sym);
    }
  });
});