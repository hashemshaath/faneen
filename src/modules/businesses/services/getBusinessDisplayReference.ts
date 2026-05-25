/**
 * BM-REF-REBUILD-1 — Step C
 *
 * Pure display helper. Picks the safe, user-facing reference for a business:
 *   - primary  : new ENT-… ref_id
 *   - secondary: legacy BIZ-… ref_id (hint only)
 *
 * Never returns: UUID, provider_intent_id, tokens, login email, phone, or any
 * synthetic `@phone.qitaat.local` identifier. Those are not official references.
 */
export interface BusinessDisplayReferenceInput {
  ref_id?: string | null;
  legacy_ref_id?: string | null;
}

export interface BusinessDisplayReference {
  primary: string | null;
  secondary: string | null;
}

export function getBusinessDisplayReference(
  business: BusinessDisplayReferenceInput | null | undefined,
): BusinessDisplayReference {
  const primary = business?.ref_id ?? null;
  const legacy = business?.legacy_ref_id ?? null;
  return {
    primary,
    // Only surface legacy as a secondary hint when distinct from primary.
    secondary: legacy && legacy !== primary ? legacy : null,
  };
}