type NotificationActionLike = {
  action_url?: string | null;
  reference_type?: string | null;
  reference_id?: string | null;
};

export function resolveNotificationActionUrl(notification: NotificationActionLike): string | null {
  const actionUrl = notification.action_url?.trim() || null;

  if (notification.reference_type === 'quote_request' && notification.reference_id) {
    const quoteDetailUrl = `/dashboard/my-requests/${notification.reference_id}`;
    return !actionUrl || actionUrl === '/dashboard/my-requests' ? quoteDetailUrl : actionUrl;
  }

  return actionUrl;
}