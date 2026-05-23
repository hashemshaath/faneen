import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = resolve(__dirname, '../../../../');
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf8');

const FILES = [
  'pages/Notifications.tsx',
  'pages/dashboard/DashboardNotifications.tsx',
  'components/notifications/NotificationBell.tsx',
];

describe('N-3 migration: notification mutation callsites use service wrappers', () => {
  for (const rel of FILES) {
    it(`${rel}: no direct notifications update/delete`, () => {
      const s = read(rel);
      expect(s).not.toMatch(/\.from\(\s*['"]notifications['"]\s*\)\s*\.\s*update/);
      expect(s).not.toMatch(/\.from\(\s*['"]notifications['"]\s*\)\s*\.\s*delete/);
    });

    it(`${rel}: imports mutation services from @/modules/notifications`, () => {
      const s = read(rel);
      expect(s).toMatch(/from\s+['"]@\/modules\/notifications['"]/);
      expect(s).toMatch(/markNotificationRead/);
      expect(s).toMatch(/markAllNotificationsRead/);
      expect(s).toMatch(/deleteNotification\s+as\s+deleteNotificationSvc/);
    });

    it(`${rel}: mutation invocations preserve filters via service calls`, () => {
      const s = read(rel);
      expect(s).toMatch(/markNotificationRead\(\s*id\s*\)/);
      expect(s).toMatch(/markAllNotificationsRead\(\s*user!\.id\s*\)/);
      expect(s).toMatch(/deleteNotificationSvc\(\s*id\s*\)/);
    });
  }

  it('Notifications.tsx: preserves invalidateQueries onSuccess for all-notifications', () => {
    const s = read('pages/Notifications.tsx');
    expect(s).toMatch(/invalidateQueries\(\{\s*queryKey:\s*\['all-notifications',\s*user\?\.id\]\s*\}\)/);
  });

  it('DashboardNotifications.tsx: preserves dual invalidate for all-notifications + notifications', () => {
    const s = read('pages/dashboard/DashboardNotifications.tsx');
    expect(s).toMatch(/queryKey:\s*\['all-notifications'\]/);
    expect(s).toMatch(/queryKey:\s*\['notifications'\]/);
  });

  it('NotificationBell.tsx: preserves invalidate for notifications query', () => {
    const s = read('components/notifications/NotificationBell.tsx');
    expect(s).toMatch(/invalidateQueries\(\{\s*queryKey:\s*\['notifications',\s*user\?\.id\]\s*\}\)/);
  });

  it('realtime subscriptions migrated in N-4 to subscribeUserNotifications', () => {
    expect(read('pages/dashboard/DashboardNotifications.tsx')).toMatch(/subscribeUserNotifications/);
    expect(read('components/notifications/NotificationBell.tsx')).toMatch(/subscribeUserNotifications/);
  });

  it('preferences migrated in N-5 to preference services', () => {
    const s = read('pages/dashboard/DashboardCommunicationPreferences.tsx');
    expect(s).toMatch(/upsertUserNotificationPreferences/);
    expect(s).toMatch(/upsertBusinessNotificationPreferences/);
  });
});