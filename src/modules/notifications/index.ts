// Module: notifications
// Public API.
export {
  sendTransactionalEmail,
  type SendTransactionalEmailPayload,
} from './services/sendTransactionalEmail';
export {
  createNotification,
  createNotificationFireAndForget,
  type CreateNotificationPayload,
} from './services/createNotification';
// N-2 read/list/count services.
export {
  listNotificationsForUser,
  type ListNotificationsForUserArgs,
} from './services/listNotificationsForUser';
export { listRecentNotificationsForUser } from './services/listRecentNotificationsForUser';
export { countUnreadNotificationsForUser } from './services/countUnreadNotificationsForUser';
export { countNotificationsForUserSince } from './services/countNotificationsForUserSince';
export { listNotificationCreatedAtSeries } from './services/listNotificationCreatedAtSeries';
export { listLiveActivityNotifications } from './services/listLiveActivityNotifications';
// N-3 mutation services.
export { markNotificationRead } from './services/markNotificationRead';
export { markAllNotificationsRead } from './services/markAllNotificationsRead';
export { deleteNotification } from './services/deleteNotification';
// N-4 realtime helper.
export {
  subscribeUserNotifications,
  type NotificationRealtimeEvent,
  type NotificationRealtimeListener,
  type SubscribeUserNotificationsArgs,
} from './services/realtime/subscribeUserNotifications';
// N-5 preferences services.
export { getUserNotificationPreferences } from './services/preferences/getUserNotificationPreferences';
export { upsertUserNotificationPreferences } from './services/preferences/upsertUserNotificationPreferences';
export { getBusinessNotificationPreferences } from './services/preferences/getBusinessNotificationPreferences';
export { upsertBusinessNotificationPreferences } from './services/preferences/upsertBusinessNotificationPreferences';
