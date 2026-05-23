import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(__dirname, '../../');
const SCRIPT = resolve(ROOT, 'scripts/notifications-isolation-audit.mjs');

describe('notifications-isolation-audit.mjs', () => {
  it('script file exists', () => {
    expect(existsSync(SCRIPT)).toBe(true);
  });

  it('declares the expected allowed production paths', () => {
    const src = readFileSync(SCRIPT, 'utf8');
    expect(src).toContain('src/modules/notifications/services/');
    expect(src).toContain('src/modules/notifications/index.ts');
  });

  it('enforces all three notification tables + notifications realtime', () => {
    const src = readFileSync(SCRIPT, 'utf8');
    expect(src).toContain('"notifications"');
    expect(src).toContain('"notification_preferences"');
    expect(src).toContain('"business_notification_preferences"');
    expect(src).toMatch(/postgres_changes/);
  });

  it('DashboardCommunicationPreferences no longer directly accesses notification preference tables', () => {
    const src = readFileSync(
      resolve(ROOT, 'src/pages/dashboard/DashboardCommunicationPreferences.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/\.from\(\s*['"]notification_preferences['"]\s*\)/);
    expect(src).not.toMatch(/\.from\(\s*['"]business_notification_preferences['"]\s*\)/);
  });

  it('DashboardNotifications has no direct notifications table or realtime access', () => {
    const src = readFileSync(
      resolve(ROOT, 'src/pages/dashboard/DashboardNotifications.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/\.from\(\s*['"]notifications['"]\s*\)/);
    expect(src).not.toMatch(/postgres_changes[\s\S]{0,200}?table\s*:\s*['"]notifications['"]/);
  });

  it('NotificationBell has no direct notifications table or realtime access', () => {
    const src = readFileSync(
      resolve(ROOT, 'src/components/notifications/NotificationBell.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/\.from\(\s*['"]notifications['"]\s*\)/);
    expect(src).not.toMatch(/postgres_changes[\s\S]{0,200}?table\s*:\s*['"]notifications['"]/);
  });

  it('LiveActivityWidget has no direct notifications table or realtime access', () => {
    const src = readFileSync(
      resolve(ROOT, 'src/components/dashboard/overview/widgets/LiveActivityWidget.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/\.from\(\s*['"]notifications['"]\s*\)/);
    expect(src).not.toMatch(/postgres_changes[\s\S]{0,200}?table\s*:\s*['"]notifications['"]/);
  });

  it('ClientSiteNotificationPreferencesCard RPCs remain out of scope (not flagged)', () => {
    const src = readFileSync(
      resolve(ROOT, 'src/components/client-sites/ClientSiteNotificationPreferencesCard.tsx'),
      'utf8',
    );
    expect(src).toMatch(/get_client_site_notification_preferences/);
    expect(src).toMatch(/update_client_site_notification_preferences/);
    const scriptSrc = readFileSync(SCRIPT, 'utf8');
    expect(scriptSrc).not.toMatch(/get_client_site_notification_preferences/);
    expect(scriptSrc).not.toMatch(/update_client_site_notification_preferences/);
  });

  it('currently passes (exit 0) against the live source tree', () => {
    const out = execFileSync('node', [SCRIPT], { cwd: ROOT, encoding: 'utf8' });
    expect(out).toMatch(/No unauthorized direct notification access found/);
  }, 30_000);
});