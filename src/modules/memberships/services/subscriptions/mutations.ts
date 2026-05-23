import { supabase } from '@/integrations/supabase/client';

/**
 * Thin RPC wrappers for membership subscription lifecycle (MEMB-3).
 *
 * Pass through RPC arguments verbatim and return raw `{ data, error }`.
 * No transformation, no thrown errors of their own — callsites keep
 * their existing throw/toast/invalidation semantics.
 */

export interface SubscribeToPlanArgs {
  _user_id: string;
  _plan_id: string;
  _business_id: string | null;
  _billing_cycle: string;
}

export async function subscribeToPlan(args: SubscribeToPlanArgs) {
  const { data, error } = await supabase.rpc('subscribe_to_plan', args);
  return { data, error };
}

export interface CancelSubscriptionAtPeriodEndArgs {
  _subscription_id: string;
  _downgrade_to_plan_id: string | null;
}

export async function cancelSubscriptionAtPeriodEnd(args: CancelSubscriptionAtPeriodEndArgs) {
  const { data, error } = await supabase.rpc('cancel_subscription_at_period_end', args);
  return { data, error };
}

export interface ResumeSubscriptionRenewalArgs {
  _subscription_id: string;
}

export async function resumeSubscriptionRenewal(args: ResumeSubscriptionRenewalArgs) {
  const { data, error } = await supabase.rpc('resume_subscription_renewal', args);
  return { data, error };
}

export interface CancelSubscriptionArgs {
  _subscription_id: string;
}

export async function cancelSubscription(args: CancelSubscriptionArgs) {
  const { data, error } = await supabase.rpc('cancel_subscription', args);
  return { data, error };
}

export interface AdminUpgradeSubscriptionArgs {
  _subscription_id: string;
  _new_plan_id: string;
  _billing_cycle: string;
}

export async function adminUpgradeSubscription(args: AdminUpgradeSubscriptionArgs) {
  const { data, error } = await supabase.rpc('admin_upgrade_subscription', args);
  return { data, error };
}