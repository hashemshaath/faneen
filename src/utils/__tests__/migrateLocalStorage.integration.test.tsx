/**
 * Integration tests for the legacy → qitaat storage migration.
 *
 * Unlike the unit tests in `migrateLocalStorage.test.ts` (which exercise
 * the migration utility in isolation), these tests run end-to-end inside
 * jsdom with real React components mounted, the same way they would
 * mount on a user's first boot:
 *
 *   1. Seed jsdom localStorage / sessionStorage / cookies with realistic
 *      `faneen_*` data left over from the previous brand.
 *   2. Run `migrateLegacyStorage()` exactly as `src/main.tsx` does.
 *   3. Mount the actual `LanguageProvider` and child components that
 *      read `qitaat_*` via the production `qitaatStorage` helpers.
 *   4. Assert the user-visible state matches what the legacy data should
 *      have produced — proving the migration plumbs through to real UI.
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';

// Stub Supabase so telemetry doesn't try to hit the network during tests
const insertSpy = vi.fn().mockResolvedValue({ error: null });
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({ insert: insertSpy }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

import { migrateLegacyStorage, runMigrationManually } from '../migrateLocalStorage';
import { LanguageProvider, useLanguage } from '@/i18n/LanguageContext';
import {
  readQitaatItem,
  readQitaatJSON,
  writeQitaatJSON,
} from '@/utils/qitaatStorage';

// ---------- helpers --------------------------------------------------------

/** Reset every storage scope between tests so cases can't leak into each other. */
function resetWorld() {
  localStorage.clear();
  sessionStorage.clear();
  if (typeof document !== 'undefined') {
    document.cookie.split(';').forEach((c) => {
      const name = c.split('=')[0]?.trim();
      if (name) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      }
    });
  }
  insertSpy.mockClear();
  insertSpy.mockResolvedValue({ error: null });
}

/** A tiny child component that surfaces what a real consumer would see. */
function LangProbe() {
  const { language, dir, isRTL } = useLanguage();
  return (
    <div>
      <span data-testid="lang">{language}</span>
      <span data-testid="dir">{dir}</span>
      <span data-testid="rtl">{isRTL ? 'yes' : 'no'}</span>
    </div>
  );
}

/** A page-like component that reads search history the way real hooks do. */
function SearchHistoryProbe() {
  const history = readQitaatJSON<string[]>('qitaat_search_history', []);
  return (
    <ul data-testid="history">
      {history.map((h, i) => (
        <li key={i} data-testid={`history-item-${i}`}>{h}</li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------

describe('Integration — boot scenario: legacy faneen_* data present', () => {
  beforeEach(resetWorld);

  it('a returning user with faneen_lang=en sees an English UI after boot', () => {
    localStorage.setItem('faneen_lang', 'en');

    migrateLegacyStorage();

    render(
      <LanguageProvider>
        <LangProbe />
      </LanguageProvider>,
    );

    expect(screen.getByTestId('lang').textContent).toBe('en');
    expect(screen.getByTestId('dir').textContent).toBe('ltr');
    expect(screen.getByTestId('rtl').textContent).toBe('no');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
    expect(localStorage.getItem('faneen_lang')).toBeNull();
  });

  it('a returning Arabic user with faneen_lang=ar sees an RTL UI after boot', () => {
    localStorage.setItem('faneen_lang', 'ar');
    localStorage.setItem(
      'faneen_search_history',
      JSON.stringify(['ألمنيوم', 'حديد', 'زجاج']),
    );

    migrateLegacyStorage();

    render(
      <LanguageProvider>
        <LangProbe />
        <SearchHistoryProbe />
      </LanguageProvider>,
    );

    expect(screen.getByTestId('lang').textContent).toBe('ar');
    expect(screen.getByTestId('rtl').textContent).toBe('yes');
    expect(document.documentElement.dir).toBe('rtl');

    expect(screen.getByTestId('history-item-0').textContent).toBe('ألمنيوم');
    expect(screen.getByTestId('history-item-1').textContent).toBe('حديد');
    expect(screen.getByTestId('history-item-2').textContent).toBe('زجاج');
  });

  it('first-boot user with NO legacy data still mounts cleanly with Arabic default', () => {
    migrateLegacyStorage();

    render(
      <LanguageProvider>
        <LangProbe />
      </LanguageProvider>,
    );

    expect(screen.getByTestId('lang').textContent).toBe('ar');
    expect(localStorage.getItem('qitaat_migration_v1_done')).toBe('1');
  });
});

describe('Integration — orphan + cookie cleanup with live UI mounted', () => {
  beforeEach(resetWorld);

  it('orphan faneen_* keys are swept BEFORE the UI hydrates, leaving qitaat_* intact', () => {
    localStorage.setItem('faneen_lang', 'en');
    localStorage.setItem('faneen_old_filter', 'mosque');
    localStorage.setItem('faneen_legacy_cache', '{"x":1}');
    localStorage.setItem('qitaat_user_pref', 'compact');
    localStorage.setItem('sb-auth-token', 'jwt-keep-me');
    sessionStorage.setItem('faneen_temp_state', 'temp');
    sessionStorage.setItem('qitaat_session_data', 'keep');
    document.cookie = 'faneen_token=stale; path=/';
    document.cookie = 'qitaat_session=fresh; path=/';

    migrateLegacyStorage();

    render(
      <LanguageProvider>
        <LangProbe />
      </LanguageProvider>,
    );

    expect(screen.getByTestId('lang').textContent).toBe('en');

    expect(localStorage.getItem('faneen_old_filter')).toBeNull();
    expect(localStorage.getItem('faneen_legacy_cache')).toBeNull();
    expect(sessionStorage.getItem('faneen_temp_state')).toBeNull();

    expect(localStorage.getItem('qitaat_user_pref')).toBe('compact');
    expect(localStorage.getItem('sb-auth-token')).toBe('jwt-keep-me');
    expect(sessionStorage.getItem('qitaat_session_data')).toBe('keep');
    expect(document.cookie).toContain('qitaat_session=fresh');
    expect(document.cookie).not.toContain('faneen_token=stale');
  });

  it('boot is idempotent — a second boot does not regress UI state or rewrite values', () => {
    localStorage.setItem('faneen_lang', 'en');
    localStorage.setItem('faneen_search_history', JSON.stringify(['boot1']));

    migrateLegacyStorage();
    const langAfterBoot1 = readQitaatItem('qitaat_lang');
    const historyAfterBoot1 = readQitaatJSON<string[]>('qitaat_search_history', []);

    writeQitaatJSON('qitaat_search_history', [...historyAfterBoot1, 'boot1-add']);

    migrateLegacyStorage();

    render(
      <LanguageProvider>
        <LangProbe />
        <SearchHistoryProbe />
      </LanguageProvider>,
    );

    expect(screen.getByTestId('lang').textContent).toBe(langAfterBoot1);
    expect(screen.getByTestId('history-item-1').textContent).toBe('boot1-add');
  });
});

describe('Integration — manual retry from admin tool with mounted UI', () => {
  beforeEach(resetWorld);

  it('runMigrationManually re-cleans newly arrived legacy keys WITHOUT breaking active UI', async () => {
    migrateLegacyStorage();

    const { unmount } = render(
      <LanguageProvider>
        <LangProbe />
      </LanguageProvider>,
    );
    expect(screen.getByTestId('lang').textContent).toBe('ar');

    localStorage.setItem('faneen_legacy_late', 'oops');
    sessionStorage.setItem('faneen_late_session', 'oops');

    let result: Awaited<ReturnType<typeof runMigrationManually>> | undefined;
    await act(async () => {
      result = await runMigrationManually();
    });

    expect(localStorage.getItem('faneen_legacy_late')).toBeNull();
    expect(sessionStorage.getItem('faneen_late_session')).toBeNull();
    expect(result!.status).toBe('success');
    expect(result!.sweptLocalKeys).toContain('faneen_legacy_late');
    expect(result!.sweptSessionKeys).toContain('faneen_late_session');
    expect(insertSpy).toHaveBeenCalled();

    expect(screen.getByTestId('lang').textContent).toBe('ar');
    unmount();
  });

  it('manual retry on a store with many orphans completes via the batched async path', async () => {
    // Seed enough orphans to cross BATCH_THRESHOLD (40) so the async/yielding
    // path is exercised end-to-end inside the test runtime.
    for (let i = 0; i < 80; i++) {
      localStorage.setItem(`faneen_bulk_${i}`, String(i));
    }
    localStorage.setItem('qitaat_keep_me', 'safe');

    const result = await runMigrationManually();

    expect(result.status).toBe('success');
    expect(result.sweptLocal).toBe(80);
    expect(localStorage.getItem('qitaat_keep_me')).toBe('safe');
    for (let i = 0; i < 80; i++) {
      expect(localStorage.getItem(`faneen_bulk_${i}`)).toBeNull();
    }

    render(
      <LanguageProvider>
        <LangProbe />
      </LanguageProvider>,
    );
    expect(screen.getByTestId('lang').textContent).toBe('ar');
  });
});
