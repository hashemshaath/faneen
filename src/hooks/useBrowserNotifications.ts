import { useCallback, useEffect, useRef } from 'react';

type PermissionState = 'granted' | 'denied' | 'default';

export const useBrowserNotifications = () => {
  const permissionRef = useRef<PermissionState>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );

  const isSupported = typeof Notification !== 'undefined';

  const requestPermission = useCallback(async (): Promise<PermissionState> => {
    if (!isSupported) return 'denied';
    if (Notification.permission === 'granted') {
      permissionRef.current = 'granted';
      return 'granted';
    }
    if (Notification.permission === 'denied') return 'denied';
    const result = await Notification.requestPermission();
    permissionRef.current = result;
    return result;
  }, [isSupported]);

  const showNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (!isSupported || Notification.permission !== 'granted') return;
      // Don't show if the tab is focused
      if (document.visibilityState === 'visible') return;
      try {
        new Notification(title, {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          dir: 'auto',
          ...options,
        });
      } catch {
        // Silent fail on environments that block Notification constructor
      }
    },
    [isSupported],
  );

  return { isSupported, requestPermission, showNotification, permission: permissionRef };
};
