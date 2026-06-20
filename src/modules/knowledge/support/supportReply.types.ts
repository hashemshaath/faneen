/**
 * Phase-5 — support reply types. No transport, no DB, no AI — purely the
 * shape of a draft reply produced from `knowledgeRegistry` via the Phase-4
 * assistant guardrails.
 */
import type { KnowledgeAudience, KnowledgeLocale } from '../knowledge.types';

export type SupportReplyChannel = 'email' | 'whatsapp' | 'ticket' | 'in_app';
export type SupportReplyTone = 'neutral' | 'friendly' | 'formal';

export type SupportIntent =
  | 'account_access'
  | 'password_reset'
  | 'email_verification'
  | 'rfq_status'
  | 'quote_request'
  | 'file_upload_issue'
  | 'provider_visibility'
  | 'provider_profile_completion'
  | 'payments_invoices'
  | 'membership_limits'
  | 'technical_support'
  | 'complaint_dispute'
  | 'contract_award'
  | 'unknown';

export interface SupportReplyInput {
  message: string;
  audience: KnowledgeAudience;
  channel: SupportReplyChannel;
  locale: KnowledgeLocale;
  tone?: SupportReplyTone;
}

export interface SupportReplyDraft {
  intent: SupportIntent;
  canAnswer: boolean;
  reply: string;
  confidence: number;
  sources: string[];
  relatedRoutes: string[];
  escalationRecommended: boolean;
  missingInformation: string[];
}