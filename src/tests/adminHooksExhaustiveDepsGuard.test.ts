/**
 * ADMIN HOOKS EXHAUSTIVE-DEPS GUARD.
 *
 * Tracks every `eslint-disable react-hooks/exhaustive-deps` suppression inside
 * the admin scope (`src/pages/admin/**`, `src/components/admin/**`).
 *
 * Each suppression must appear in the ALLOWLIST below with a documented reason
 * and a follow-up. Any new, undocumented suppression fails the guard. When a
 * suppression is removed from source, drop the corresponding entry here so the
 * ratchet keeps moving toward zero.
 *
 * This guard intentionally does NOT touch fetch/mutation behavior — every
 * entry below is a `keep temporarily with reason` decision because removing
 * the dep would change fetch ordering, debounce timing, or one-shot init.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';

const ROOTS = [
  path.resolve(__dirname, '../pages/admin'),
  path.resolve(__dirname, '../components/admin'),
];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const full = path.join(dir, e);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(tsx?|ts)$/.test(e)) out.push(full);
  }
  return out;
}

const DISABLE_RE = /eslint-disable(?:-next-line|-line)?\s+react-hooks\/exhaustive-deps/;

type Entry = {
  file: string;        // path relative to repo root
  count: number;       // expected number of suppressions in this file
  reason: string;      // why these suppressions exist today
  followup: string;    // how/when we plan to drop them
};

const ALLOWLIST: ReadonlyArray<Entry> = [
  {
    file: 'src/pages/admin/approvalsCenter/ApprovalsInbox.tsx',
    count: 1,
    reason: 'Memoized aggregation depends on a flattened `dataUpdatedAt` fingerprint of N parallel queries to recompute only when fresh data arrives; depending on the raw `queries` array would recompute every render.',
    followup: 'Collapse the six approvals queries into a single aggregated query and depend on its data directly.',
  },
  {
    file: 'src/pages/admin/AdminContactMessages.tsx',
    count: 1,
    reason: 'Auto-mark-as-read on focus change must trigger exactly once per focus change; including `focused`/`updateMutation` in deps would re-mark a message that the admin manually flipped back to unread after re-focusing.',
    followup: 'Move auto-mark-as-read into a focus-id state machine that distinguishes admin-driven status changes from initial focus.',
  },
];

describe('ADMIN HOOKS EXHAUSTIVE-DEPS GUARD', () => {
  const files = ROOTS.flatMap(walk);

  const actual = new Map<string, number>();
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    let n = 0;
    for (const line of src.split('\n')) if (DISABLE_RE.test(line)) n++;
    if (n > 0) {
      const rel = path.relative(path.resolve(__dirname, '../..'), f).replace(/\\/g, '/');
      actual.set(rel, n);
    }
  }

  const allowed = new Map(ALLOWLIST.map(e => [e.file, e]));

  it('every admin-scope suppression is documented in the allowlist', () => {
    const undocumented: string[] = [];
    for (const [file, n] of actual) {
      const entry = allowed.get(file);
      if (!entry) undocumented.push(`${file} (${n} suppression(s) — add allowlist entry with reason + follow-up)`);
    }
    expect(undocumented, undocumented.join('\n')).toEqual([]);
  });

  it('suppression counts match the allowlist ceiling exactly', () => {
    const drift: string[] = [];
    for (const entry of ALLOWLIST) {
      const got = actual.get(entry.file) ?? 0;
      if (got !== entry.count) {
        drift.push(`${entry.file}: expected ${entry.count}, found ${got} — update the allowlist when adjusting suppressions`);
      }
    }
    expect(drift, drift.join('\n')).toEqual([]);
  });

  it('allowlist entries all carry a reason and a follow-up', () => {
    for (const entry of ALLOWLIST) {
      expect(entry.reason.length, `${entry.file} reason`).toBeGreaterThan(20);
      expect(entry.followup.length, `${entry.file} followup`).toBeGreaterThan(10);
    }
  });
});