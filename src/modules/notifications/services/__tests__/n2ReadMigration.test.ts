import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = resolve(__dirname, '../../../../');
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf8');

describe('N-2 migration: notification read callsites use service wrappers', () => {
  it('Notifications.tsx: uses listNotificationsForUser; no direct notifications select', () => {
    const s = read('pages/Notifications.tsx');
    expect(s).toMatch(/listNotificationsForUser\(/);
    expect(s).not.toMatch(/\.from\(\s*['"]notifications['"]\s*\)\s*\.\s*select/);
    expect(s).toMatch(/queryKey:\s*\['all-notifications',\s*user\?\.id\]/);
    // N-3: mutations migrated to services
    expect(s).not.toMatch(/\.from\(\s*['"]notifications['"]\s*\)\s*\.\s*update/);
    expect(s).not.toMatch(/\.from\(\s*['"]notifications['"]\s*\)\s*\.\s*delete/);
  });

  it('DashboardNotifications.tsx: uses listNotificationsForUser with limit 500; realtime + mutations remain direct', () => {
    const s = read('pages/dashboard/DashboardNotifications.tsx');
    expect(s).toMatch(/listNotificationsForUser\(\{\s*userId:\s*user!\.id,\s*limit:\s*500\s*\}\)/);
    expect(s).not.toMatch(/\.from\(\s*['"]notifications['"]\s*\)\s*\.\s*select/);
    // N-4: realtime migrated to subscribeUserNotifications helper
    expect(s).toMatch(/subscribeUserNotifications/);
    // N-3: mutations migrated to services
    expect(s).not.toMatch(/\.from\(\s*['"]notifications['"]\s*\)\s*\.\s*update/);
    expect(s).not.toMatch(/\.from\(\s*['"]notifications['"]\s*\)\s*\.\s*delete/);
  });

  it('NotificationBell.tsx: uses listNotificationsForUser with limit 50; realtime + mutations remain direct', () => {
    const s = read('components/notifications/NotificationBell.tsx');
    expect(s).toMatch(/listNotificationsForUser\(\{\s*userId:\s*user!\.id,\s*limit:\s*50\s*\}\)/);
    expect(s).not.toMatch(/\.from\(\s*['"]notifications['"]\s*\)\s*\.\s*select/);
    expect(s).toMatch(/subscribeUserNotifications/);
    // N-3: mutations migrated to services
    expect(s).not.toMatch(/\.from\(\s*['"]notifications['"]\s*\)\s*\.\s*update/);
    expect(s).not.toMatch(/\.from\(\s*['"]notifications['"]\s*\)\s*\.\s*delete/);
  });

  it('UserDashboardView.tsx: uses countUnreadNotificationsForUser + listRecentNotificationsForUser', () => {
    const s = read('pages/dashboard/overview/UserDashboardView.tsx');
    expect(s).toMatch(/countUnreadNotificationsForUser\(\{\s*userId:\s*user\.id\s*\}\)/);
    expect(s).toMatch(/listRecentNotificationsForUser<Row>\(/);
    expect(s).not.toMatch(/\.from\(\s*['"]notifications['"]\s*\)\s*\.\s*select/);
  });

  it('ProviderEngagementPreviews.tsx: uses listRecentNotificationsForUser with limit 10', () => {
    const s = read('components/dashboard/ProviderEngagementPreviews.tsx');
    expect(s).toMatch(/listRecentNotificationsForUser<NotificationRow>\(/);
    expect(s).toMatch(/limit:\s*10/);
    expect(s).not.toMatch(/\.from\(\s*['"]notifications['"]\s*\)\s*\.\s*select/);
  });

  it('TrendsWidget.tsx: uses listNotificationCreatedAtSeries (limit 500)', () => {
    const s = read('components/dashboard/overview/widgets/TrendsWidget.tsx');
    expect(s).toMatch(/listNotificationCreatedAtSeries\(\{\s*userId,\s*sinceIso:\s*since,\s*limit:\s*500\s*\}\)/);
    expect(s).not.toMatch(/\.from\(\s*['"]notifications['"]\s*\)\s*\.\s*select/);
  });

  it('LiveActivityWidget.tsx: uses listLiveActivityNotifications (limit 15); realtime remains direct', () => {
    const s = read('components/dashboard/overview/widgets/LiveActivityWidget.tsx');
    expect(s).toMatch(/listLiveActivityNotifications\(\{\s*userId,\s*limit:\s*15\s*\}\)/);
    expect(s).not.toMatch(/\.from\(\s*['"]notifications['"]\s*\)\s*\.\s*select/);
    expect(s).toMatch(/subscribeUserNotifications/);
  });

  it('shared.tsx TodaySummary: uses countNotificationsForUserSince', () => {
    const s = read('components/dashboard/overview/shared.tsx');
    expect(s).toMatch(/countNotificationsForUserSince\(\{\s*userId,\s*sinceIso:\s*`\$\{today\}T00:00:00Z`\s*\}\)/);
    expect(s).not.toMatch(/\.from\(\s*['"]notifications['"]\s*\)\s*\.\s*select/);
  });

  it('insert services remain unchanged', () => {
    const s = read('modules/notifications/services/createNotification.ts');
    expect(s).toMatch(/supabase\.from\(\s*'notifications'\s*\)\.insert/);
  });
});