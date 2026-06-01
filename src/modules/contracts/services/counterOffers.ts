/**
 * Client API for contract counter offers (party-to-party negotiation on
 * draft / pending_approval contracts before signing).
 *
 * RLS guarantees only the contract parties or business managers can read,
 * propose, or respond.
 */
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/modules/identity/services/session';

export type CounterOfferStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

export interface CounterOffer {
  id: string;
  contract_id: string;
  proposer_id: string;
  field_path: string;
  field_label_ar: string | null;
  field_label_en: string | null;
  old_value: unknown;
  new_value: unknown;
  message: string | null;
  status: CounterOfferStatus;
  responded_at: string | null;
  responded_by: string | null;
  response_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProposeOfferInput {
  contractId: string;
  fieldPath: string;
  fieldLabelAr?: string;
  fieldLabelEn?: string;
  oldValue: unknown;
  newValue: unknown;
  message?: string;
}

export async function listCounterOffers(contractId: string): Promise<CounterOffer[]> {
  const { data, error } = await supabase
    .from('contract_counter_offers')
    .select('*')
    .eq('contract_id', contractId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CounterOffer[];
}

export async function proposeCounterOffer(input: ProposeOfferInput): Promise<CounterOffer> {
  const { data: userData } = await getCurrentUser();
  const proposerId = userData?.user?.id;
  if (!proposerId) throw new Error('unauthenticated');

  const { data, error } = await supabase
    .from('contract_counter_offers')
    .insert({
      contract_id: input.contractId,
      proposer_id: proposerId,
      field_path: input.fieldPath,
      field_label_ar: input.fieldLabelAr ?? null,
      field_label_en: input.fieldLabelEn ?? null,
      old_value: input.oldValue as never,
      new_value: input.newValue as never,
      message: input.message ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as CounterOffer;
}

export async function respondToCounterOffer(
  offerId: string,
  decision: Exclude<CounterOfferStatus, 'pending'>,
  responseMessage?: string,
): Promise<CounterOffer> {
  const { data: userData } = await getCurrentUser();
  const userId = userData?.user?.id;
  if (!userId) throw new Error('unauthenticated');

  const { data, error } = await supabase
    .from('contract_counter_offers')
    .update({
      status: decision,
      responded_at: new Date().toISOString(),
      responded_by: userId,
      response_message: responseMessage ?? null,
    })
    .eq('id', offerId)
    .select('*')
    .single();
  if (error) throw error;
  return data as CounterOffer;
}