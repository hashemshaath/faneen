import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(__dirname, '../../');
const DOC = resolve(ROOT, 'docs/contracts-governance-audit-1.md');

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

describe('CONTRACTS-GOVERNANCE-AUDIT-1', () => {
  it('audit document exists with all required deliverable sections', () => {
    expect(existsSync(DOC)).toBe(true);
    const src = readFileSync(DOC, 'utf8');
    for (const heading of [
      'Contract lifecycle map',
      'Ownership matrix',
      'Parties model',
      'Approval chain',
      'History & immutability audit',
      'Revisions audit',
      'Signing audit',
      'Notifications audit',
      'Permissions audit',
      'Integration audit',
      'UI audit',
      'Risk scorecard',
    ]) {
      expect(src).toContain(heading);
    }
  });

  it('contract module does not read roles from profiles (privilege escalation guard)', () => {
    const files = walk(resolve(ROOT, 'src/modules/contracts'));
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      // forbid reading role/is_admin off profiles in contract code
      expect(src).not.toMatch(/from\(['"]profiles['"]\)[^;]*\.(?:eq|select)\([^)]*['"](?:role|is_admin)['"]/);
    }
  });

  it('contract module does not import WhatsApp/SMS SDKs (scope guard)', () => {
    const files = walk(resolve(ROOT, 'src/modules/contracts'));
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      expect(src).not.toMatch(/from\s+['"](?:twilio|@whiskeysockets\/baileys|whatsapp-web\.js)['"]/);
    }
  });

  it('contract surfaces do not introduce Dialog/AlertDialog popups (no-popup policy)', () => {
    const files = walk(resolve(ROOT, 'src/modules/contracts/components'));
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      expect(src).not.toMatch(/from\s+['"]@\/components\/ui\/(?:dialog|alert-dialog)['"]/);
    }
  });

  it('contracts isolation audit script remains wired (governance perimeter intact)', () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
    expect(pkg.scripts['contracts-isolation-audit']).toBe(
      'node scripts/contracts-isolation-audit.mjs',
    );
  });

  it('referenced governance docs all exist', () => {
    for (const rel of [
      'docs/contracts-system-overview.md',
      'docs/contracts-rpc-reference.md',
      'docs/contracts-security-privacy.md',
      'docs/contract-pricing-engine.md',
      'docs/contract-pdf-qa.md',
    ]) {
      expect(existsSync(resolve(ROOT, rel))).toBe(true);
    }
  });

  it('canonical contract status registry remains the single source of truth', () => {
    const lib = readFileSync(resolve(ROOT, 'src/lib/contract-statuses.ts'), 'utf8');
    for (const s of ['draft', 'pending_approval', 'active', 'completed', 'cancelled', 'disputed']) {
      expect(lib).toContain(`'${s}'`);
    }
    expect(lib).toMatch(/isContractLockedByStatus/);
  });
});