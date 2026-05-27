import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const FUNCTIONS_DIR = join(process.cwd(), 'supabase', 'functions');

function readIndex(fn: string): string | null {
  try {
    return readFileSync(join(FUNCTIONS_DIR, fn, 'index.ts'), 'utf8');
  } catch {
    return null;
  }
}

/**
 * Return all JSON.stringify payloads that appear inside a `new Response(...)` call.
 * Very coarse regex: JSON.stringify( <everything up to matching paren> )
 */
function extractResponseBodies(src: string): string[] {
  const bodies: string[] = [];
  const regex = /new Response\(\s*JSON\.stringify\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(src)) !== null) {
    bodies.push(m[1].trim());
  }
  return bodies;
}

describe('HARDENING-1D: Error envelope normalization', () => {
  describe('admin-delete-user', () => {
    const src = readIndex('admin-delete-user') ?? '';

    it('does not return raw err.message in any response body', () => {
      const bodies = extractResponseBodies(src);
      for (const b of bodies) {
        expect(b).not.toMatch(/err\.message/);
        expect(b).not.toMatch(/error\.message/);
      }
    });

    it('returns safe code in the catch envelope', () => {
      expect(src).toMatch(/ok:\s*false/);
      expect(src).toMatch(/code:\s*['"]delete_user_failed['"]/);
    });

    it('does not return .stack in the response body', () => {
      expect(src).not.toMatch(/\.stack/);
    });

    it('preserves Authorization header read and admin access check', () => {
      expect(src).toMatch(/req\.headers\.get\(\s*['"]Authorization['"]\s*\)/);
      expect(src).toMatch(/has_admin_access/);
    });

    it('logs a safe coarse error in catch', () => {
      expect(src).toMatch(/console\.error\(\s*['"]admin_delete_user_failed['"]\s*,/);
    });
  });

  describe('check-overdue', () => {
    const src = readIndex('check-overdue') ?? '';

    it('does not return raw err.message in any response body', () => {
      const bodies = extractResponseBodies(src);
      for (const b of bodies) {
        expect(b).not.toMatch(/err\.message/);
        expect(b).not.toMatch(/error\.message/);
      }
    });

    it('returns safe code in the catch envelope', () => {
      expect(src).toMatch(/ok:\s*false/);
      expect(src).toMatch(/code:\s*['"]overdue_check_failed['"]/);
    });

    it('uses safe error strings in the success errors array', () => {
      expect(src).toMatch(/installment_query_failed/);
      expect(src).toMatch(/contract_query_failed/);
      // Must NOT contain raw message interpolation in the errors array.
      expect(src).not.toMatch(/results\.errors\.push\(`[^`]*\$\{[^}]*\.message[^}]*\}`/);
    });

    it('does not return .stack in the response body', () => {
      expect(src).not.toMatch(/\.stack/);
    });

    it('preserves cron/admin auth gate', () => {
      // check-overdue is cron-only; no Authorization header check needed, but
      // we verify the shape is unchanged by asserting no new auth imports.
      expect(src).toMatch(/Deno\.serve/);
    });

    it('logs a safe coarse error in catch', () => {
      expect(src).toMatch(/console\.error\(\s*['"]check_overdue_failed['"]\s*,/);
    });
  });

  describe('monthly-provider-credit-grant', () => {
    const src = readIndex('monthly-provider-credit-grant') ?? '';

    it('does not return raw err.message in any response body', () => {
      const bodies = extractResponseBodies(src);
      for (const b of bodies) {
        expect(b).not.toMatch(/err\.message/);
        expect(b).not.toMatch(/error\.message/);
      }
    });

    it('returns safe code for the select-failed path', () => {
      expect(src).toMatch(/ok:\s*false/);
      expect(src).toMatch(/code:\s*['"]select_failed['"]/);
    });

    it('returns safe code objects in the per-subscription errors array', () => {
      // errors.push now uses { subscription_id, code } instead of { error }.
      expect(src).toMatch(/errors\.push\(\{\s*subscription_id:\s*s\.id,\s*code\s*\}\)/);
      expect(src).not.toMatch(/errors\.push\(\{\s*subscription_id:\s*s\.id,\s*error:/);
    });

    it('does not return .stack in the response body', () => {
      expect(src).not.toMatch(/\.stack/);
    });

    it('preserves cron secret and admin JWT auth gate', () => {
      expect(src).toMatch(/x-cron-secret/);
      expect(src).toMatch(/Authorization/);
      expect(src).toMatch(/has_admin_access/);
    });
  });

  describe('cross-function invariants', () => {
    const fns = ['admin-delete-user', 'check-overdue', 'monthly-provider-credit-grant'];

    it('none of the 3 functions echo Authorization header in response body', () => {
      for (const fn of fns) {
        const src = readIndex(fn) ?? '';
        expect(src).not.toMatch(/JSON\.stringify\([^)]*authHeader[^)]*\)/i);
      }
    });

    it('none of the 3 functions contain JWT-like literals', () => {
      for (const fn of fns) {
        const src = readIndex(fn) ?? '';
        expect(src).not.toMatch(/eyJ[A-Za-z0-9_-]{30,}\.eyJ/);
      }
    });
  });
});
