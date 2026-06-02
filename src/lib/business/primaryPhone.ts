/**
 * Single source of truth for "the primary contact phone" of a business.
 *
 * Multiple tables / views expose different phone columns:
 *   - `phone`                     ← canonical primary contact
 *   - `customer_service_phone`    ← fallback (public-facing CS line)
 *   - `account_manager_phone`     ← internal account-manager line
 *   - `client_phone`              ← (project/contract context only)
 *
 * Every screen, notification, and audit log that surfaces "the main
 * available number" MUST go through this helper so the value is
 * identical everywhere.
 */

export interface BusinessPhoneFields {
  phone?: string | null;
  customer_service_phone?: string | null;
  account_manager_phone?: string | null;
}

/** Returns the trimmed primary phone, or `null` if none is set. */
export function getBusinessPrimaryPhone(
  business: BusinessPhoneFields | null | undefined,
): string | null {
  if (!business) return null;
  const candidates = [
    business.phone,
    business.customer_service_phone,
    business.account_manager_phone,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim().length > 0) return c.trim();
  }
  return null;
}

/** Display-friendly version with the country code preserved. Always LTR. */
export function formatPrimaryPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.trim();
}