import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertSafeNoteText,
  sanitizeAdminNoteMetadata,
  isOfficialAdminNoteRef,
} from '@/modules/admin';

const root = resolve(__dirname, '..');
const NOTES_DIR = resolve(root, 'modules/admin/services/notes');
const LIST = readFileSync(resolve(NOTES_DIR, 'listAdminOperationalNotes.ts'), 'utf8');
const CREATE = readFileSync(resolve(NOTES_DIR, 'createAdminOperationalNote.ts'), 'utf8');
const RESOLVE = readFileSync(resolve(NOTES_DIR, 'resolveAdminOperationalNote.ts'), 'utf8');
const SUMMARY = readFileSync(resolve(NOTES_DIR, 'getAdminOperationalNotesSummary.ts'), 'utf8');
const PANEL = readFileSync(resolve(root, 'components/admin/AdminOperationalNotesPanel.tsx'), 'utf8');
const PAGE = readFileSync(resolve(root, 'pages/admin/AdminOperationsConsole.tsx'), 'utf8');
const ADMIN_INDEX = readFileSync(resolve(root, 'modules/admin/index.ts'), 'utf8');

function latestMigration(): string {
  const dir = resolve(root, '../supabase/migrations');
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  // Find the migration containing our table create
  for (let i = files.length - 1; i >= 0; i--) {
    const sql = readFileSync(resolve(dir, files[i]), 'utf8');
    if (sql.includes('admin_operational_notes')) return sql;
  }
  return '';
}
const MIG = latestMigration();

describe('BUSINESS-ADMIN-2 — migration', () => {
  it('creates admin_operational_notes with required columns', () => {
    expect(MIG).toMatch(/CREATE TABLE IF NOT EXISTS public\.admin_operational_notes/);
    for (const col of [
      'ref_id text NOT NULL',
      'entity_type text NOT NULL',
      'note text NOT NULL',
      "severity text NOT NULL DEFAULT 'info'",
      "status text NOT NULL DEFAULT 'open'",
      'created_by uuid',
      'created_at timestamptz NOT NULL DEFAULT now()',
      'resolved_by uuid',
      'resolved_at timestamptz',
      "metadata jsonb NOT NULL DEFAULT '{}'::jsonb",
    ]) expect(MIG).toContain(col);
  });

  it('enforces ref pattern + severity + status + note length checks', () => {
    expect(MIG).toMatch(/ref_id ~ '\^\[A-Z\]\{2,6\}-\[A-Z0-9\]\+\$'/);
    expect(MIG).toMatch(/severity IN \('info','warning','critical'\)/);
    expect(MIG).toMatch(/status IN \('open','resolved'\)/);
    expect(MIG).toMatch(/char_length\(note\) BETWEEN 1 AND 2000/);
  });

  it('enables RLS with admin-only policies and no anon/delete', () => {
    expect(MIG).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(MIG).toMatch(/CREATE POLICY "Admins read operational notes"/);
    expect(MIG).toMatch(/CREATE POLICY "Admins create operational notes"/);
    expect(MIG).toMatch(/CREATE POLICY "Admins update operational notes"/);
    expect(MIG).not.toMatch(/FOR DELETE/);
    expect(MIG).not.toMatch(/TO anon/);
    expect(MIG).not.toMatch(/GRANT[^;]*\bON public\.admin_operational_notes\b[^;]*TO anon/);
  });

  it('uses has_admin_access security definer in policies', () => {
    expect(MIG).toMatch(/public\.has_admin_access\(auth\.uid\(\)\)/);
  });

  it('installs append-only guard trigger', () => {
    expect(MIG).toMatch(/admin_operational_notes_guard/);
    expect(MIG).toMatch(/only status\/resolved fields may be updated/);
  });
});

describe('BUSINESS-ADMIN-2 — sanitization helpers', () => {
  it('rejects empty / oversized notes', () => {
    expect(() => assertSafeNoteText('')).toThrow();
    expect(() => assertSafeNoteText('a'.repeat(2001))).toThrow();
  });

  it('rejects forbidden content patterns', () => {
    for (const bad of [
      'token: provider_intent_id=pi_123',
      'use client_secret=sk_test_xxxxxxxxxxxxxxxx',
      'Authorization: Bearer abcdefghij1234567890',
      'access_token=foo',
      'jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkw.SflKxw',
      'contact user@phone.qitaat.com',
    ]) expect(() => assertSafeNoteText(bad)).toThrow();
  });

  it('accepts safe notes', () => {
    expect(() => assertSafeNoteText('Customer asked to reschedule.')).not.toThrow();
  });

  it('whitelists metadata keys and rejects forbidden values', () => {
    expect(sanitizeAdminNoteMetadata({ source: 'inbound', secret: 'x' })).toEqual({ source: 'inbound' });
    expect(sanitizeAdminNoteMetadata({ source: 'eyJabcdef.eyJabcdef.SflKxw' })).toEqual({});
    expect(sanitizeAdminNoteMetadata(null)).toEqual({});
  });

  it('validates official ref shape (rejects UUIDs / junk)', () => {
    expect(isOfficialAdminNoteRef('WO-1000001')).toBe(true);
    expect(isOfficialAdminNoteRef('CNT-1')).toBe(true);
    expect(isOfficialAdminNoteRef('550e8400-e29b-41d4-a716-446655440000')).toBe(false);
    expect(isOfficialAdminNoteRef('')).toBe(false);
    expect(isOfficialAdminNoteRef('lower-case')).toBe(false);
  });
});

describe('BUSINESS-ADMIN-2 — service wrappers', () => {
  it('list wrapper uses the correct table and sanitizes metadata', () => {
    expect(LIST).toMatch(/from\(['"]admin_operational_notes['"]\)/);
    expect(LIST).toMatch(/sanitizeAdminNoteMetadata/);
    expect(LIST).toMatch(/order\(['"]created_at['"]/);
  });

  it('create wrapper validates ref, sanitizes, and stamps created_by from auth', () => {
    expect(CREATE).toMatch(/isOfficialRef/);
    expect(CREATE).toMatch(/assertSafeNoteText/);
    expect(CREATE).toMatch(/sanitizeAdminNoteMetadata/);
    expect(CREATE).toMatch(/supabase\.auth\.getUser/);
    expect(CREATE).toMatch(/from\(['"]admin_operational_notes['"]\)\s*\.insert/);
    expect(CREATE).toMatch(/status: 'open' as const/);
  });

  it('resolve wrapper only updates status/resolved fields and scopes to open rows', () => {
    expect(RESOLVE).toMatch(/\.update\(\{[\s\S]*status: 'resolved'[\s\S]*resolved_by[\s\S]*resolved_at[\s\S]*\}\)/);
    expect(RESOLVE).toMatch(/\.eq\(['"]status['"], ['"]open['"]\)/);
    expect(RESOLVE).not.toMatch(/ref_id:/);
    expect(RESOLVE).not.toMatch(/note:/);
  });

  it('no delete wrapper exists', () => {
    const files = readdirSync(NOTES_DIR);
    for (const f of files) {
      expect(f.toLowerCase()).not.toMatch(/delete/);
    }
    expect(LIST + CREATE + RESOLVE + SUMMARY).not.toMatch(/\.delete\(/);
  });

  it('admin barrel re-exports the four wrappers', () => {
    for (const sym of [
      'listAdminOperationalNotes',
      'createAdminOperationalNote',
      'resolveAdminOperationalNote',
      'getAdminOperationalNotesSummary',
    ]) expect(ADMIN_INDEX).toContain(sym);
  });

  it('summary wrapper derives via list wrapper — no direct table access', () => {
    expect(SUMMARY).toMatch(/listAdminOperationalNotes/);
    expect(SUMMARY).not.toMatch(/from\(['"]admin_operational_notes['"]\)/);
  });
});

describe('BUSINESS-ADMIN-2 — UI panel', () => {
  it('panel imports only admin wrappers — no direct supabase.from', () => {
    expect(PANEL).toMatch(/from ['"]@\/modules\/admin['"]/);
    expect(PANEL).not.toMatch(/supabase\.from\(/);
    expect(PANEL).not.toMatch(/from\(['"]admin_operational_notes['"]\)/);
  });

  it('panel exposes create form and resolve action, no delete', () => {
    expect(PANEL).toMatch(/admin-notes-create-submit/);
    expect(PANEL).toMatch(/admin-note-resolve/);
    expect(PANEL).not.toMatch(/admin-note-delete/);
    expect(PANEL).not.toMatch(/onClick=\{[^}]*delete/i);
  });

  it('panel has bilingual escalation summary copy', () => {
    for (const s of ['Open', 'Critical', 'Older than 7 days']) expect(PANEL).toContain(s);
    for (const s of ['مفتوحة', 'حرجة', 'متأخرة']) expect(PANEL).toContain(s);
  });

  it('panel does not import notifications / cron / realtime / payments / auth', () => {
    for (const bad of [
      /@\/modules\/notifications/,
      /@\/modules\/payments/,
      /@\/modules\/memberships/,
      /@\/modules\/auth\b/,
      /supabase\.channel\(/,
      /postgres_changes/,
      /setInterval\(/,
    ]) expect(PANEL).not.toMatch(bad);
  });

  it('panel never renders provider_intent_id / tokens / synthetic emails', () => {
    expect(PANEL).not.toMatch(/provider_intent_id/);
    expect(PANEL).not.toMatch(/client_secret/);
    expect(PANEL).not.toMatch(/access_token/);
    expect(PANEL).not.toMatch(/@phone\./);
  });

  it('console page embeds AdminOperationalNotesPanel', () => {
    expect(PAGE).toMatch(/AdminOperationalNotesPanel/);
    expect(PAGE).toMatch(/from ['"]@\/components\/admin\/AdminOperationalNotesPanel['"]/);
  });

  it('console page still uses noindex + requireAdmin protection (unchanged)', () => {
    expect(PAGE).toMatch(/useNoIndex\(\)/);
  });

  it('panel has no href="#"', () => {
    expect(PANEL).not.toMatch(/href="#"/);
  });
});