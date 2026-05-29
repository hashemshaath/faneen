/**
 * CUSTOMER-EXPERIENCE-3 — Customer-facing token-gated actions.
 * Token is forwarded to RPC; never stored or logged.
 */
import { supabase } from '@/integrations/supabase/client';
import { FEEDBACK_TEXT_MAX_LEN, ISSUE_TEXT_MAX_LEN } from '../types';

function missing(): { ok: false; error: Error } {
  return { ok: false, error: new Error('missing_required') };
}

function mapErr(error: { message?: string } | null): Error {
  const msg = error?.message ?? '';
  if (msg.includes('already_submitted')) return new Error('already_submitted');
  if (msg.includes('closure_locked')) return new Error('closure_locked');
  if (msg.includes('closure_not_found')) return new Error('closure_not_found');
  if (msg.includes('invalid_rating')) return new Error('invalid_rating');
  if (msg.includes('invalid_score')) return new Error('invalid_score');
  if (msg.includes('invalid_token')) return new Error('invalid_token');
  if (msg.includes('expired')) return new Error('expired');
  if (msg.includes('revoked')) return new Error('revoked');
  return new Error('action_failed');
}

export async function customerConfirmCompletion(input: {
  trackingRef: string;
  token: string;
}): Promise<{ ok: boolean; error?: Error }> {
  if (!input.trackingRef || !input.token) return missing();
  const { error } = await supabase.rpc('customer_confirm_project_completion', {
    _tracking_ref: input.trackingRef,
    _token: input.token,
  });
  if (error) return { ok: false, error: mapErr(error) };
  return { ok: true };
}

export async function customerReportProjectIssue(input: {
  trackingRef: string;
  token: string;
  text: string;
}): Promise<{ ok: boolean; error?: Error }> {
  if (!input.trackingRef || !input.token) return missing();
  const text = (input.text ?? '').slice(0, ISSUE_TEXT_MAX_LEN).trim();
  if (!text) return { ok: false, error: new Error('missing_text') };
  const { error } = await supabase.rpc('customer_report_project_issue', {
    _tracking_ref: input.trackingRef,
    _token: input.token,
    _text: text,
  });
  if (error) return { ok: false, error: mapErr(error) };
  return { ok: true };
}

export async function customerSubmitFeedback(input: {
  trackingRef: string;
  token: string;
  rating: number;
  text?: string | null;
  wouldRecommend?: boolean | null;
}): Promise<{ ok: boolean; error?: Error }> {
  if (!input.trackingRef || !input.token) return missing();
  if (!Number.isFinite(input.rating) || input.rating < 1 || input.rating > 5) {
    return { ok: false, error: new Error('invalid_rating') };
  }
  const text = (input.text ?? '').slice(0, FEEDBACK_TEXT_MAX_LEN);
  const { error } = await supabase.rpc('customer_submit_feedback', {
    _tracking_ref: input.trackingRef,
    _token: input.token,
    _rating: Math.round(input.rating),
    _text: text || undefined,
    _would_recommend: input.wouldRecommend ?? undefined,
  });
  if (error) return { ok: false, error: mapErr(error) };
  return { ok: true };
}

export async function customerSubmitNps(input: {
  trackingRef: string;
  token: string;
  score: number;
}): Promise<{ ok: boolean; error?: Error }> {
  if (!input.trackingRef || !input.token) return missing();
  if (!Number.isFinite(input.score) || input.score < 0 || input.score > 10) {
    return { ok: false, error: new Error('invalid_score') };
  }
  const { error } = await supabase.rpc('customer_submit_nps', {
    _tracking_ref: input.trackingRef,
    _token: input.token,
    _score: Math.round(input.score),
  });
  if (error) return { ok: false, error: mapErr(error) };
  return { ok: true };
}