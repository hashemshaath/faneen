import { supabase } from '@/integrations/supabase/client';
import type {
  CreateMembershipPaymentIntentInput,
  ConfirmMembershipPaymentInput,
  ReconcileMembershipPaymentStatusInput,
} from './types';

/**
 * R4F-8C: Future edge function wrappers for provider-agnostic membership
 * payments. Scaffolded but NOT wired into UI in this phase. The underlying
 * edge functions are not implemented yet (R4F-8D/E).
 */

export async function createMembershipPaymentIntent(
  payload: CreateMembershipPaymentIntentInput,
) {
  return supabase.functions.invoke('membership-payment-create-intent', {
    body: payload,
  });
}

export async function confirmMembershipPayment(
  payload: ConfirmMembershipPaymentInput,
) {
  return supabase.functions.invoke('membership-payment-confirm', {
    body: payload,
  });
}

export async function reconcileMembershipPaymentStatus(
  payload: ReconcileMembershipPaymentStatusInput,
) {
  return supabase.functions.invoke('membership-payment-reconcile', {
    body: payload,
  });
}