/**
 * password_reset_log payload + query option shapes (ID-4).
 *
 * IMPORTANT: never accept or store raw passwords / OTP / token values.
 * Only public identifiers and request metadata are allowed.
 */
export type PasswordResetLogStatus = 'requested' | 'resend' | 'completed' | 'failed';

export interface PasswordResetLogInsert {
  email: string;
  status: PasswordResetLogStatus | string;
  user_id?: string | null;
  request_id?: string | null;
  user_agent?: string | null;
}

export interface ListPasswordResetLogsOptions {
  /** Inclusive lower bound on created_at (ISO string). */
  sinceIso?: string | null;
  limit?: number;
  /** Defaults to '*' to preserve existing callsite behavior. */
  selectColumns?: string;
}