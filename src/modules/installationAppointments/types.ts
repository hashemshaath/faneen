/**
 * CUSTOMER-EXPERIENCE-2 — Installation appointment types.
 * Provider-side row + customer-safe snapshot block. Never expose
 * internal_note, created_by, or staff identity to customer surfaces.
 */
export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'reschedule_requested'
  | 'completed'
  | 'cancelled';

export type AppointmentConfirmationStatus =
  | 'pending'
  | 'confirmed'
  | 'reschedule_requested';

export interface InstallationAppointmentRow {
  id: string;
  ref_id: string;
  business_id: string;
  work_order_id: string;
  customer_tracking_link_id: string | null;
  scheduled_date: string;
  time_window: string | null;
  status: AppointmentStatus;
  customer_confirmation_status: AppointmentConfirmationStatus;
  customer_note: string | null;
  internal_note: string | null;
  confirmed_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Customer-facing snapshot block. NO internal_note, NO created_by. */
export interface CustomerInstallationBlock {
  appointment_ref: string;
  date: string;
  time_window: string | null;
  status: AppointmentStatus;
  confirmation_status: AppointmentConfirmationStatus;
  customer_note: string | null;
}

export const CUSTOMER_NOTE_MAX_LEN = 1000;