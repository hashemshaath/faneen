export * from './types';
export {
  createInstallationAppointment,
  updateInstallationAppointment,
  cancelInstallationAppointment,
  completeInstallationAppointment,
  getInstallationAppointmentByWorkOrder,
  listInstallationAppointmentsForBusiness,
} from './services/providerActions';
export {
  confirmAppointment,
  requestAppointmentReschedule,
} from './services/customerActions';

/**
 * Pure metric aggregation for operations center. Pure function, no I/O.
 */
import type { InstallationAppointmentRow } from './types';

export interface InstallationMetrics {
  scheduled: number;
  awaitingConfirmation: number;
  rescheduleRequests: number;
  completed: number;
  /** Appointments within 24h that are not yet confirmed. */
  alertWithin24hUnconfirmed: number;
  /** Appointments whose scheduled date has passed but not completed/cancelled. */
  alertOverdue: number;
  /** Reschedule requests awaiting action (status reschedule_requested). */
  alertRescheduleAwaitingAction: number;
}

export function computeInstallationMetrics(
  rows: InstallationAppointmentRow[],
  now: Date = new Date(),
): InstallationMetrics {
  let scheduled = 0;
  let awaitingConfirmation = 0;
  let rescheduleRequests = 0;
  let completed = 0;
  let alertWithin24hUnconfirmed = 0;
  let alertOverdue = 0;
  let alertRescheduleAwaitingAction = 0;

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const in24h = new Date(now.getTime() + 24 * 3600 * 1000);

  for (const r of rows) {
    if (r.status === 'scheduled') scheduled++;
    if (r.status === 'completed') completed++;
    if (r.status === 'reschedule_requested') {
      rescheduleRequests++;
      alertRescheduleAwaitingAction++;
    }
    if (
      r.customer_confirmation_status === 'pending' &&
      r.status !== 'cancelled' &&
      r.status !== 'completed'
    ) {
      awaitingConfirmation++;
    }
    if (r.scheduled_date) {
      const d = new Date(r.scheduled_date + 'T00:00:00');
      if (
        d.getTime() >= today.getTime() &&
        d.getTime() <= in24h.getTime() &&
        r.status !== 'confirmed' &&
        r.status !== 'completed' &&
        r.status !== 'cancelled'
      ) {
        alertWithin24hUnconfirmed++;
      }
      if (
        d.getTime() < today.getTime() &&
        r.status !== 'completed' &&
        r.status !== 'cancelled'
      ) {
        alertOverdue++;
      }
    }
  }

  return {
    scheduled,
    awaitingConfirmation,
    rescheduleRequests,
    completed,
    alertWithin24hUnconfirmed,
    alertOverdue,
    alertRescheduleAwaitingAction,
  };
}