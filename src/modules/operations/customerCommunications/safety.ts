/**
 * BUSINESS-OPERATIONS-INTELLIGENCE-1 — Safety helpers for the
 * customer-project notification dispatcher.
 *
 * Pure module — no Supabase, no environment access.
 */
import { isSyntheticPhoneEmail } from '@/lib/auth-email';

/** Action URL prefixes that are safe to put into a customer-facing message. */
export const SAFE_ACTION_URL_PREFIXES = [
  'https://qitaat.com/q/',
  'https://www.qitaat.com/q/',
  '/q/',
] as const;

const UUID_RE = /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/;

export function isSafeCustomerActionUrl(url: string | null | undefined): boolean {
  if (!url) return true; // omission is safe
  if (UUID_RE.test(url)) return false;
  return SAFE_ACTION_URL_PREFIXES.some((p) => url.startsWith(p));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isDeliverableCustomerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  if (!EMAIL_RE.test(email)) return false;
  if (isSyntheticPhoneEmail(email)) return false;
  // Test-mode and example domains must never be delivered to.
  const lower = email.toLowerCase();
  if (lower.endsWith('@example.com')) return false;
  if (lower.endsWith('@test.local')) return false;
  return true;
}