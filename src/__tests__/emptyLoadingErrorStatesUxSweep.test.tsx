import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (p: string) => fs.readFileSync(path.resolve(process.cwd(), p), 'utf-8');

describe('EMPTY + LOADING + ERROR STATES UX SWEEP — guards', () => {
  it('AdminNotificationsConfig has loading, empty, and error+retry states', () => {
    const src = read('src/pages/admin/AdminNotificationsConfig.tsx');
    expect(src).toMatch(/isLoading\s*\?/);
    expect(src).toMatch(/eventGroups\.length\s*===\s*0/);
    expect(src).toMatch(/isError/);
    expect(src).toMatch(/refetch\(\)/);
    expect(src).toMatch(/إعادة المحاولة|Retry/);
    expect(src).toMatch(/تعذّر تحميل القوالب|Failed to load templates/);
  });

  it('Notifications page renders an empty state', () => {
    const src = read('src/pages/Notifications.tsx');
    expect(src).toMatch(/isLoading|Skeleton/);
    expect(src).toMatch(/لا توجد|No notifications|Empty/i);
  });

  it('Search page (SearchV3) renders a no-results state', () => {
    const src = read('src/pages/SearchV3.tsx');
    expect(src).toMatch(/لا توجد|No results|no_results|noResults|Empty/i);
  });

  it('Touched files contain no `as any`, hex, or service_role references', () => {
    const files = ['src/pages/admin/AdminNotificationsConfig.tsx'];
    for (const f of files) {
      const src = read(f);
      expect(src, `${f} has 'as any'`).not.toMatch(/\bas\s+any\b/);
      expect(src, `${f} has hardcoded hex`).not.toMatch(/#[0-9a-fA-F]{6}\b/);
      expect(src, `${f} references service_role`).not.toMatch(/service_role/);
    }
  });
});