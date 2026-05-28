import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildTriageCsv,
  triageCsvFilename,
  TRIAGE_CSV_COLUMNS,
} from '@/lib/admin/triageCsv';
import {
  savedRefSetsStorageKey,
  saveRefSet,
  listSavedRefSets,
  renameRefSet,
  deleteRefSet,
  refsToTextarea,
  SAVED_SETS_MAX,
  REFS_PER_SET_MAX,
  SET_NAME_MAX,
  SAVED_REF_SETS_KEY_PREFIX,
} from '@/lib/admin/savedRefSets';
import type { AdminBulkTriageRow } from '@/modules/admin';

const PAGE = readFileSync(
  resolve(__dirname, '../pages/admin/AdminBulkReferenceTriage.tsx'),
  'utf8',
);
const CSV_SRC = readFileSync(
  resolve(__dirname, '../lib/admin/triageCsv.ts'),
  'utf8',
);
const SETS_SRC = readFileSync(
  resolve(__dirname, '../lib/admin/savedRefSets.ts'),
  'utf8',
);

function row(over: Partial<AdminBulkTriageRow> = {}): AdminBulkTriageRow {
  return {
    ref_id: 'WO-1000001',
    status: 'found',
    bundle: {
      found: true,
      summary: {
        ref_id: 'WO-1000001',
        entity_type: 'work_order',
        label: 'Install windows',
        status: 'open',
        priority: 'high',
        business_ref_id: null,
        source_ref_id: null,
        created_at: null,
        updated_at: null,
        canonical_route: '/dashboard/work-orders/abc',
      },
      related_refs: [{ ref_id: 'TASK-1', kind: 'task' }, { ref_id: 'CNT-9', kind: 'contract' }],
      notes: [],
    } as unknown as AdminBulkTriageRow['bundle'],
    openNotes: 2,
    criticalNotes: 1,
    topSeverity: 'critical',
    errorMessage: null,
    ...over,
  };
}

describe('BUSINESS-ADMIN-6 — CSV export', () => {
  it('exports exactly the approved safe columns', () => {
    expect(TRIAGE_CSV_COLUMNS).toEqual([
      'ref_id',
      'status',
      'entity_type',
      'label',
      'item_status',
      'priority',
      'open_notes_count',
      'critical_notes_count',
      'related_refs_count',
      'canonical_route',
    ]);
  });

  it('header line matches columns', () => {
    const csv = buildTriageCsv([row()]);
    expect(csv.split('\n')[0]).toBe(TRIAGE_CSV_COLUMNS.join(','));
  });

  it('emits sanitized row data', () => {
    const csv = buildTriageCsv([row()]);
    const line = csv.split('\n')[1];
    expect(line).toContain('WO-1000001');
    expect(line).toContain('found');
    expect(line).toContain('work_order');
    expect(line).toContain('Install windows');
    expect(line).toContain('open');
    expect(line).toContain('high');
    expect(line).toContain('/dashboard/work-orders/abc');
    // related_refs_count = 2, open_notes_count = 2, critical_notes_count = 1
    expect(line.split(',')).toEqual(expect.arrayContaining(['2', '1', '2']));
  });

  it('escapes commas, quotes, and newlines', () => {
    const r = row({
      bundle: {
        ...(row().bundle as object),
        summary: {
          ...(row().bundle!.summary as object),
          label: 'Hello, "world"\nnewline',
        },
      } as AdminBulkTriageRow['bundle'],
    });
    const csv = buildTriageCsv([r]);
    expect(csv).toContain('"Hello, ""world""\nnewline"');
  });

  it('filename matches qitaat-triage-YYYY-MM-DD.csv', () => {
    const name = triageCsvFilename(new Date('2026-05-28T12:00:00Z'));
    expect(name).toMatch(/^qitaat-triage-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it('never references unsafe fields (UUID/token/provider_intent_id/synthetic email)', () => {
    for (const bad of [
      /provider_intent_id/,
      /access_token/,
      /client_secret/,
      /@phone\./,
      /\buuid\b/i,
      /phone_number/,
      /\bemail\b/i,
    ]) {
      expect(CSV_SRC).not.toMatch(bad);
    }
  });

  it('page wires Export CSV button (disabled until results)', () => {
    expect(PAGE).toMatch(/data-testid="triage-export-csv"/);
    expect(PAGE).toMatch(/disabled=\{rows\.length === 0\}/);
    expect(PAGE).toMatch(/downloadTriageCsv/);
  });
});

describe('BUSINESS-ADMIN-6 — Saved ref sets (localStorage)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('scopes key per admin uid', () => {
    expect(savedRefSetsStorageKey('abc-123')).toBe(`${SAVED_REF_SETS_KEY_PREFIX}abc-123`);
    expect(savedRefSetsStorageKey(null)).toBe(`${SAVED_REF_SETS_KEY_PREFIX}anon`);
    expect(savedRefSetsStorageKey('a/b\\c')).toBe(`${SAVED_REF_SETS_KEY_PREFIX}a_b_c`);
  });

  it('saves valid refs only and rejects UUID/malformed', () => {
    const r = saveRefSet({
      uid: 'u1',
      name: 'My set',
      rawRefs: 'WO-1000001\n550e8400-e29b-41d4-a716-446655440000\nnot-a-ref\nCNT-100',
    });
    expect(r.error).toBeNull();
    expect(r.data!.refs).toEqual(['WO-1000001', 'CNT-100']);
  });

  it('rejects empty/long names', () => {
    expect(saveRefSet({ uid: 'u1', name: '', rawRefs: 'WO-1' }).error).toBe('invalid_name');
    expect(saveRefSet({ uid: 'u1', name: 'x'.repeat(SET_NAME_MAX + 1), rawRefs: 'WO-1' }).error).toBe('invalid_name');
  });

  it('rejects when no valid refs after parsing', () => {
    expect(saveRefSet({ uid: 'u1', name: 'set', rawRefs: 'garbage\nnot-a-ref' }).error).toBe('no_valid_refs');
  });

  it('enforces max refs per set (100)', () => {
    const many = Array.from({ length: REFS_PER_SET_MAX + 25 }, (_, i) => `WO-${1000000 + i}`).join('\n');
    const r = saveRefSet({ uid: 'u1', name: 'big', rawRefs: many });
    expect(r.error).toBeNull();
    expect(r.data!.refs.length).toBe(REFS_PER_SET_MAX);
  });

  it('enforces max saved sets (20)', () => {
    for (let i = 0; i < SAVED_SETS_MAX; i += 1) {
      const r = saveRefSet({ uid: 'u1', name: `set ${i}`, rawRefs: 'WO-1000001' });
      expect(r.error).toBeNull();
    }
    const overflow = saveRefSet({ uid: 'u1', name: 'too many', rawRefs: 'WO-1000001' });
    expect(overflow.error).toBe('too_many_sets');
  });

  it('isolates sets per uid', () => {
    saveRefSet({ uid: 'admin-a', name: 'A', rawRefs: 'WO-1000001' });
    saveRefSet({ uid: 'admin-b', name: 'B', rawRefs: 'CNT-100' });
    expect(listSavedRefSets('admin-a').map((s) => s.name)).toEqual(['A']);
    expect(listSavedRefSets('admin-b').map((s) => s.name)).toEqual(['B']);
  });

  it('renames and deletes saved sets locally', () => {
    const created = saveRefSet({ uid: 'u1', name: 'old', rawRefs: 'WO-1000001' }).data!;
    const renamed = renameRefSet({ uid: 'u1', id: created.id, newName: 'new' });
    expect(renamed.error).toBeNull();
    expect(listSavedRefSets('u1')[0].name).toBe('new');
    expect(deleteRefSet({ uid: 'u1', id: created.id }).ok).toBe(true);
    expect(listSavedRefSets('u1')).toEqual([]);
  });

  it('refsToTextarea is reversible round trip', () => {
    const r = saveRefSet({ uid: 'u1', name: 'rt', rawRefs: 'WO-1000001\nCNT-100' }).data!;
    expect(refsToTextarea(r.refs)).toBe('WO-1000001\nCNT-100');
  });

  it('module does no DB / network / realtime / notifications', () => {
    for (const bad of [
      /supabase\.from\(/,
      /supabase\.rpc\(/,
      /supabase\.channel\(/,
      /postgres_changes/,
      /fetch\(/,
      /@\/modules\/notifications/,
      /setInterval\(/,
    ]) expect(SETS_SRC).not.toMatch(bad);
  });

  it('storage_unavailable surfaces when localStorage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const r = saveRefSet({ uid: 'u1', name: 'ok', rawRefs: 'WO-1000001' });
    expect(r.error).toBe('storage_unavailable');
    spy.mockRestore();
  });
});

describe('BUSINESS-ADMIN-6 — page wiring & safety', () => {
  it('mounts toolbar with Save Set and Saved Sets list', () => {
    expect(PAGE).toMatch(/data-testid="triage-toolbar"/);
    expect(PAGE).toMatch(/data-testid="triage-save-set"/);
    expect(PAGE).toMatch(/data-testid="triage-saved-sets"/);
    expect(PAGE).toMatch(/saveRefSet\(/);
    expect(PAGE).toMatch(/listSavedRefSets\(/);
    expect(PAGE).toMatch(/renameRefSet\(/);
    expect(PAGE).toMatch(/deleteRefSet\(/);
  });

  it('shows bilingual local-storage helper text', () => {
    expect(PAGE).toContain('Saved locally for this admin account');
    expect(PAGE).toContain('محفوظ محليًا لهذا الحساب الإداري');
  });

  it('does not touch auth/payment/membership/notifications/realtime/cron', () => {
    for (const bad of [
      /@\/modules\/auth/,
      /@\/modules\/payments/,
      /@\/modules\/memberships/,
      /@\/modules\/notifications/,
      /supabase\.channel\(/,
      /postgres_changes/,
      /setInterval\(/,
    ]) expect(PAGE).not.toMatch(bad);
  });

  it('still has no direct supabase.from / RPC / mutations on the page', () => {
    expect(PAGE).not.toMatch(/supabase\.from\(/);
    expect(PAGE).not.toMatch(/supabase\.rpc\(/);
    expect(PAGE).not.toMatch(/\.insert\(/);
    expect(PAGE).not.toMatch(/\.update\(/);
    expect(PAGE).not.toMatch(/\.delete\(/);
  });

  it('never renders provider_intent_id, tokens, or synthetic emails', () => {
    expect(PAGE).not.toMatch(/provider_intent_id/);
    expect(PAGE).not.toMatch(/access_token/);
    expect(PAGE).not.toMatch(/client_secret/);
    expect(PAGE).not.toMatch(/@phone\./);
  });
});