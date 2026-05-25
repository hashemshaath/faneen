/**
 * BM-REF-REBUILD-1 — Step C
 *
 * Pure display helper for membership_payment_intents.
 *
 * - primary           : new PAY-… ref_id (official, user-facing)
 * - internalFallback  : provider_intent_id (admin/debug ONLY — never use as
 *                       a user-facing label; explicitly tagged unsafe)
 *
 * Tokens, login emails, phone numbers, and synthetic phone-derived auth
 * identifiers are NEVER returned.
 */
export interface PaymentDisplayReferenceInput {
  ref_id?: string | null;
  provider_intent_id?: string | null;
}

export interface PaymentDisplayReference {
  primary: string | null;
  /**
   * Provider-side identifier. UNSAFE to show to end users as the official
   * payment reference — exposed only for admin/debug surfaces that must
   * label it clearly as "internal".
   */
  internalFallback: string | null;
  internalFallbackUnsafe: true;
}

export function getPaymentDisplayReference(
  intent: PaymentDisplayReferenceInput | null | undefined,
): PaymentDisplayReference {
  return {
    primary: intent?.ref_id ?? null,
    internalFallback: intent?.provider_intent_id ?? null,
    internalFallbackUnsafe: true,
  };
}