// Module: contact
// Public API — thin EF-4 wrappers around contact/email-ops edge functions.
export { runWeeklySlaReport } from './services/weeklySlaReport';
export { triageContactMessage } from './services/triageContactMessage';
export { testContactWebhook } from './services/testContactWebhook';