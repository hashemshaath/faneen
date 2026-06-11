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
    file: 'src/components/admin/BusinessOwnerPanel.tsx',
    count: 1,
    reason: 'Effect resets form only when the selected owner identity changes; depending on the whole owner object would clobber unsaved edits on every refetch.',
    followup: 'Move form reset into the owner-load query onSuccess and remove the effect.',
  },
  {
    file: 'src/pages/admin/approvalsCenter/ApprovalsInbox.tsx',
    count: 2,
    reason: '(1) Status auto-broaden must fire only on category change, not on status. (2) Memoized aggregation depends on a flattened updatedAt fingerprint to avoid recomputing on every query identity flip.',
    followup: 'Replace with a derived selector once approvals queries return a single aggregated query.',
  },
  {
    file: 'src/pages/admin/AdminHomeSectors.tsx',
    count: 1,
    reason: 'Effect syncs URL search params only when the named filter slice changes; depending on the full searchParams object loops.',
    followup: 'Extract a stable filter signature via useMemo and depend on it.',
  },
  {
    file: 'src/pages/admin/AdminBusinesses.tsx',
    count: 2,
    reason: '(1) Debounced search sync depends only on input. (2) Focus-target effect must react only to focus param + businesses, not the unstable openEdit closure.',
    followup: 'Stabilize openEdit with useEvent (when available).',
  },
  {
    file: 'src/pages/admin/AdminContactMessages.tsx',
    count: 3,
    reason: '(1) Debounced search input sync. (2) Auto-mark-as-read on focus change must not re-run on mutation identity change. (3) Keyboard shortcut handler must avoid reattaching on every mutation reference change.',
    followup: 'Wrap mutations and updateParam in useEvent-style stable callbacks.',
  },
  {
    file: 'src/pages/admin/AdminEntityAccessRequests.tsx',
    count: 1,
    reason: 'Mount-only data load; deps would trigger duplicate fetches during admin review session.',
    followup: 'Migrate to react-query and remove the manual effect.',
  },
  {
    file: 'src/pages/admin/AdminServiceActivations.tsx',
    count: 1,
    reason: 'URL param sync effect must react only to filter slice changes; including searchParams/setSearchParams loops.',
    followup: 'Encapsulate filter ↔ URL sync into a dedicated hook.',
  },
  {
    file: 'src/pages/admin/AdminUsers.tsx',
    count: 2,
    reason: '(1) Focus param resolver runs on admin/searchParams change; including handlers would re-run on every render. (2) Pending-focus resolver depends on profiles list arrival only.',
    followup: 'Refactor focus handling into a small state machine hook.',
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