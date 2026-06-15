/**
 * password_reset_log payload + query option shapes (ID-4).
 *
 * IMPORTANT: never accept or store raw passwords / OTP / token values.
 * Only public identifiers and request metadata are allowed.
 */
export type PasswordResetLogStatus =
  | 'requested'
  | 'resend'
  | 'completed'
  | 'failed'
  | 'forgot_page_viewed'
  | 'reset_page_viewed'
  | 'link_clicked'
  | 'link_valid'
  | 'link_expired'
  | 'link_invalid';

export interface PasswordResetLogInsert {
  email: string;
  status: PasswordResetLogStatus | string;
  user_id?: string | null;
  request_id?: string | null;
  user_agent?: string | null;
  /**
   * Optional analytics enrichment: referrer, page path, link outcome,
   * email domain, locale, viewport, etc. Never put secrets here.
   */
  metadata?: Record<string, unknown> | null;
}

export interface ListPasswordResetLogsOptions {
  /** Inclusive lower bound on created_at (ISO string). */
  sinceIso?: string | null;
  limit?: number;
}