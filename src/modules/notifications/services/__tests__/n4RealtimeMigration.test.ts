import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = resolve(__dirname, '../../../../');
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf8');

describe('N-4 migration: notification realtime callsites use subscribeUserNotifications', () => {
  it('DashboardNotifications.tsx: no direct notifications postgres_changes; uses helper with exact channel name', () => {
    const s = read('pages/dashboard/DashboardNotifications.tsx');
    expect(s).toMatch(/subscribeUserNotifications/);
    expect(s).toMatch(/channelName:\s*`dashboard-notifications-\$\{user\.id\}`/);
    expect(s).toMatch(/event:\s*'\*'/);
    // No direct notifications-table postgres_changes subscription remains
    expect(s).not.toMatch(/supabase\s*\n?\s*\.channel\(/);
    expect(s).not.toMatch(/table:\s*'notifications'/);
    // Read + mutation services preserved
    expect(s).toMatch(/listNotificationsForUser/);
    expect(s).toMatch(/markNotificationRead/);
    expect(s).toMatch(/markAllNotificationsRead/);
    expect(s).toMatch(/deleteNotification\s+as\s+deleteNotificationSvc/);
  });

  it('NotificationBell.tsx: no direct notifications postgres_changes; helper has INSERT+UPDATE listeners on user-notifications channel', () => {
    const s = read('components/notifications/NotificationBell.tsx');
    expect(s).toMatch(/subscribeUserNotifications/);
    expect(s).toMatch(/channelName:\s*'user-notifications'/);
    expect(s).toMatch(/event:\s*'INSERT'/);
    expect(s).toMatch(/event:\s*'UPDATE'/);
    expect(s).toMatch(/handleRealtimeNotification/);
    expect(s).not.toMatch(/supabase\s*\.channel\(/);
    expect(s).not.toMatch(/table:\s*'notifications'/);
    expect(s).toMatch(/listNotificationsForUser/);
    expect(s).toMatch(/markNotificationRead/);
  });

  it('LiveActivityWidget.tsx: no direct notifications postgres_changes; helper preserves channel name + onStatus online flag', () => {
    const s = read('components/dashboard/overview/widgets/LiveActivityWidget.tsx');
    expect(s).toMatch(/subscribeUserNotifications/);
    expect(s).toMatch(/channelName:\s*`dashboard-activity-\$\{userId\}`/);
    expect(s).toMatch(/onStatus:\s*\(status\)\s*=>/);
    expect(s).toMatch(/setOnline\(status\s*===\s*'SUBSCRIBED'\)/);
    // Live-activity invalidation preserved
    expect(s).toMatch(/queryKey:\s*\['live-activity',\s*userId\]/);
    // No direct notifications channel
    expect(s).not.toMatch(/\.channel\(`dashboard-activity-\$\{userId\}`\)/);
    expect(s).not.toMatch(/table:\s*'notifications'/);
  });

  it('preferences migrated in N-5 to preference services', () => {
    const s = read('pages/dashboard/DashboardCommunicationPreferences.tsx');
    expect(s).toMatch(/getUserNotificationPreferences/);
    expect(s).toMatch(/getBusinessNotificationPreferences/);
  });

  it('insert/read/mutation services remain unchanged', () => {
    const idx = read('modules/notifications/index.ts');
    expect(idx).toMatch(/listNotificationsForUser/);
    expect(idx).toMatch(/markNotificationRead/);
    expect(idx).toMatch(/markAllNotificationsRead/);
    expect(idx).toMatch(/deleteNotification/);
    expect(idx).toMatch(/createNotification/);
    expect(idx).toMatch(/subscribeUserNotifications/);
  });
});