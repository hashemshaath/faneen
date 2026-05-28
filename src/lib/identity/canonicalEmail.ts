/**
 * CRITICAL-ENTITY-IDENTITY-ACCESS-FIX-1 — Phase 3
 * ───────────────────────────────────────────────
 * Canonical-email utilities for safe normalization, comparison, masking,
 * and synthetic/test detection. These helpers are pure and side-effect
 * free; they NEVER mutate the source `auth.users` or `profiles` data —
 * callers must perform any reconciliation explicitly and only after a
 * second-stage approval.
 */

import { isSyntheticPhoneEmail, SYNTHETIC_PHONE_EMAIL_DOMAIN } from '@/lib/auth-email';
import { maskEmail as maskEmailUI } from '@/lib/masking';

/** Test/seed domains we treat as non-deliverable, non-canonical. */
export const TEST_EMAIL_DOMAINS = [
  'example.com',
  'example.org',
  'example.net',
  'test.local',
  SYNTHETIC_PHONE_EMAIL_DOMAIN,
] as const;

const TEST_LOCAL_PREFIXES = ['test_', 'probe_', 'synthetic_'];

/**
 * Safe canonical normalization:
 *   - trim whitespace
 *   - lowercase
 *   - collapse internal whitespace (defensive)
 * Does NOT modify the underlying record — callers display/compare only.
 */
export function normalizeEmail(email: string | null | undefined): string {
  if (!email) return '';
  return email.trim().replace(/\s+/g, '').toLowerCase();
}

/**
 * Returns true when the email is internal-only (synthetic phone login),
 * test/seed (example.com etc.), or has a known QA/probe prefix.
 */
export function isSyntheticOrTestEmail(email: string | null | undefined): boolean {
  const e = normalizeEmail(email);
  if (!e) return false;
  if (isSyntheticPhoneEmail(e)) return true;
  const [local, domain] = e.split('@');
  if (!domain) return false;
  if (TEST_EMAIL_DOMAINS.some((d) => domain === d || domain.endsWith('.' + d))) return true;
  if (TEST_LOCAL_PREFIXES.some((p) => local.startsWith(p))) return true;
  return false;
}

/** Delegates to the project's UI mask helper for visual safety. */
export function maskEmail(email: string | null | undefined): string {
  return maskEmailUI(email ?? null);
}

/**
 * Compare two emails after canonical normalization.
 * Empty/null pairs are NOT considered equivalent (avoid false matches
 * across users missing emails).
 */
export function areEmailsEquivalent(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const na = normalizeEmail(a);
  const nb = normalizeEmail(b);
  if (!na || !nb) return false;
  return na === nb;
}