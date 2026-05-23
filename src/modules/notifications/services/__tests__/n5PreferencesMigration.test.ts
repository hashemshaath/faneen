import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = resolve(__dirname, '../../../../');
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf8');

describe('N-5 migration: notification preferences callsites use service wrappers', () => {
  const file = 'pages/dashboard/DashboardCommunicationPreferences.tsx';

  it('no direct notification_preferences table access', () => {
    const s = read(file);
    expect(s).not.toMatch(/\.from\(\s*['"]notification_preferences['"]\s*\)/);
  });

  it('no direct business_notification_preferences table access', () => {
    const s = read(file);
    expect(s).not.toMatch(/\.from\(\s*['"]business_notification_preferences['"]\s*\)/);
  });

  it('imports the four preference services from @/modules/notifications', () => {
    const s = read(file);
    expect(s).toMatch(/from\s+["']@\/modules\/notifications["']/);
    expect(s).toMatch(/getUserNotificationPreferences/);
    expect(s).toMatch(/upsertUserNotificationPreferences/);
    expect(s).toMatch(/getBusinessNotificationPreferences/);
    expect(s).toMatch(/upsertBusinessNotificationPreferences/);
  });

  it('user preferences read uses service with user!.id', () => {
    const s = read(file);
    expect(s).toMatch(/getUserNotificationPreferences\(\s*user!\.id\s*\)/);
  });

  it('business preferences read uses service with biz.id', () => {
    const s = read(file);
    expect(s).toMatch(/getBusinessNotificationPreferences\(\s*biz\.id\s*\)/);
  });

  it('user upsert preserves safety overrides + user_id in payload', () => {
    const s = read(file);
    expect(s).toMatch(/email_system:\s*true,\s*inapp_system:\s*true/);
    expect(s).toMatch(/upsertUserNotificationPreferences\(\{[\s\S]*?user_id:\s*user\.id,[\s\S]*?\.\.\.payload[\s\S]*?\}\)/);
  });

  it('business upsert preserves business_id + bizPrefs spread payload', () => {
    const s = read(file);
    expect(s).toMatch(/upsertBusinessNotificationPreferences\(\{[\s\S]*?business_id:\s*bizId,[\s\S]*?\.\.\.bizPrefs[\s\S]*?\}\)/);
  });

  it('preserves DEFAULTS/BIZ_DEFAULTS fallback merge logic', () => {
    const s = read(file);
    expect(s).toMatch(/\{\s*\.\.\.DEFAULTS,\s*\.\.\.\(rest as Partial<Prefs>\)\s*\}/);
    expect(s).toMatch(/\{\s*\.\.\.BIZ_DEFAULTS,\s*\.\.\.\(rest as Partial<BizPrefs>\)\s*\}/);
    expect(s).toMatch(/setBizPrefs\(BIZ_DEFAULTS\)/);
  });

  it('preserves toast success copy for both user and business saves', () => {
    const s = read(file);
    expect(s).toMatch(/تم حفظ تفضيلاتك/);
    expect(s).toMatch(/Preferences saved/);
    expect(s).toMatch(/تم حفظ تفضيلات الجهة/);
    expect(s).toMatch(/Business preferences saved/);
  });

  it('preserves query invalidation for notification-prefs', () => {
    const s = read(file);
    expect(s).toMatch(/invalidateQueries\(\{\s*queryKey:\s*\["notification-prefs"\]\s*\}\)/);
  });

  it('preserves react-query keys for both queries', () => {
    const s = read(file);
    expect(s).toMatch(/queryKey:\s*\["notification-prefs",\s*user\?\.id\]/);
    expect(s).toMatch(/queryKey:\s*\["my-primary-business",\s*user\?\.id\]/);
  });

  it('removes the now-unused supabase import', () => {
    const s = read(file);
    expect(s).not.toMatch(/from\s+["']@\/integrations\/supabase\/client["']/);
  });

  it('N-2/N-3/N-4 services remain exported from notifications module', () => {
    const idx = read('modules/notifications/index.ts');
    for (const sym of [
      'listNotificationsForUser',
      'markNotificationRead',
      'markAllNotificationsRead',
      'deleteNotification',
      'subscribeUserNotifications',
      'createNotification',
    ]) {
      expect(idx).toMatch(new RegExp(sym));
    }
  });
});