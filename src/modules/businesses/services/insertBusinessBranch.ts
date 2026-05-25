import {
  insertBusinessBranch as canonicalInsertBusinessBranch,
  insertBusinessBranchReturning as canonicalInsertBusinessBranchReturning,
} from '@/modules/catalog/services/branches/mutations';
import type { BusinessBranchInsertPayload } from '@/modules/catalog/services/branches/mutations';

/**
 * REGISTRATION-UX-FULL-COMPLETE-1 Part 2 / Part 4
 * Options-shaped facade over the canonical catalog branches wrapper.
 * All actual supabase access to the business_branches table happens inside
 * src/modules/catalog/services/branches/mutations.ts to satisfy the
 * catalog isolation audit. This file only adapts the call signature used
 * by the onboarding flow.
 */
export interface InsertBusinessBranchOptions {
  payload: Record<string, unknown>;
  select?: string;
  terminal?: 'none' | 'single' | 'maybeSingle';
}

export async function insertBusinessBranch(
  options: InsertBusinessBranchOptions,
): Promise<{ data: unknown; error: unknown }> {
  const { payload, select, terminal = 'none' } = options;
  const typedPayload = payload as unknown as BusinessBranchInsertPayload;

  if (terminal === 'none' || !select) {
    const { data, error } = await canonicalInsertBusinessBranch(typedPayload);
    return { data, error };
  }
  const { data, error } = await canonicalInsertBusinessBranchReturning(
    typedPayload,
    select,
    terminal,
  );
  return { data, error };
}