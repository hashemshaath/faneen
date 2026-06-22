/**
 * PROJECT-COMPONENTS-CLEANUP-REUSABILITY — guard test.
 *
 * Asserts:
 *  1. Shared EmptyState and ErrorRetryCard primitives exist and render.
 *  2. DashboardCredentials adopts the shared EmptyState (no local copy).
 *  3. New/modified files contain no `any`/`as any`, no `ts-ignore`,
 *     no `eslint-disable`, no hardcoded hex, no `service_role`.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { EmptyState, ErrorRetryCard } from '@/components/shared';

const ROOT = resolve(__dirname, '..', '..');
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf8');

const TOUCHED = [
  'src/components/shared/ErrorRetryCard.tsx',
  'src/components/shared/index.ts',
  'src/pages/dashboard/DashboardCredentials.tsx',
] as const;

describe('project components cleanup + reusability', () => {
  it('exports EmptyState and ErrorRetryCard from @/components/shared', () => {
    expect(typeof EmptyState).toBe('function');
    expect(typeof ErrorRetryCard).toBe('function');
  });

  it('renders EmptyState with title + description', () => {
    render(<EmptyState title="No items" description="Add one to get started" />);
    expect(screen.getByText('No items')).toBeTruthy();
    expect(screen.getByText('Add one to get started')).toBeTruthy();
  });

  it('renders ErrorRetryCard and wires the retry callback', () => {
    const onRetry = vi.fn();
    render(
      <ErrorRetryCard
        title="Could not load"
        message="Network error"
        retryLabel="Try again"
        onRetry={onRetry}
      />,
    );
    expect(screen.getByText('Could not load')).toBeTruthy();
    expect(screen.getByText('Network error')).toBeTruthy();
    const btn = screen.getByRole('button', { name: 'Try again' });
    fireEvent.click(btn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('DashboardCredentials imports the shared EmptyState and dropped its local copy', () => {
    const src = read('src/pages/dashboard/DashboardCredentials.tsx');
    expect(src).toMatch(/from ['"]@\/components\/shared['"]/);
    expect(src).toMatch(/\bEmptyState\b/);
    // No local component re-declaration.
    expect(src).not.toMatch(/const EmptyState:\s*React\.FC/);
  });

  it.each(TOUCHED)('%s has no any/ts-ignore/eslint-disable/hex/service_role', (rel) => {
    const src = read(rel);
    expect(src).not.toMatch(/:\s*any\b/);
    expect(src).not.toMatch(/\bas\s+any\b/);
    expect(src).not.toMatch(/@ts-ignore/);
    expect(src).not.toMatch(/eslint-disable/);
    expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(src).not.toMatch(/service_role/);
  });
});