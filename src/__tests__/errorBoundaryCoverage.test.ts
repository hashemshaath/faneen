/**
 * PHASE B3 — ErrorBoundary coverage guard.
 *
 * Locks in that the shared shell (DashboardLayout — used by BOTH
 * `/dashboard/*` and `/admin/*`) and the largest crash-blast page
 * (ContractDetail) render inside an <ErrorBoundary>, so a single
 * component throw cannot tear down the whole authenticated surface
 * to the root fallback.
 *
 * Source-level assertion (fast, no DOM) — sufficient because
 * `ErrorBoundary` is imported by name and rendered as JSX in both files.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function read(p: string): string {
  return readFileSync(resolve(p), 'utf8');
}

describe('ErrorBoundary coverage', () => {
  it('DashboardLayout wraps its children in <ErrorBoundary>', () => {
    const src = read('src/components/dashboard/DashboardLayout.tsx');
    expect(src).toMatch(/from ['"]@\/components\/ErrorBoundary['"]/);
    expect(src).toMatch(/<ErrorBoundary>\{children\}<\/ErrorBoundary>/);
  });

  it('ContractDetail wraps its main return in <ErrorBoundary>', () => {
    const src = read('src/pages/ContractDetail.tsx');
    expect(src).toMatch(/from ['"]@\/components\/ErrorBoundary['"]/);
    // The main return opens with <ErrorBoundary> before the top-level layout div.
    expect(src).toMatch(/return\s*\(\s*\n?\s*<ErrorBoundary>/);
  });
});