/**
 * DASHBOARD MESSAGES PAGE EXTRACTION — closeout guard.
 *
 * Locks safe extraction of filteredConversations / groupedMessages / stats
 * derivations into `useMessagesDerivations`, and asserts no
 * messaging behaviour-sensitive concerns were touched.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const PAGE = path.resolve(__dirname, '../pages/dashboard/DashboardMessages.tsx');
const HOOK = path.resolve(__dirname, '../hooks/useMessagesDerivations.ts');
const APP = path.resolve(__dirname, '../App.tsx');

const read = (p: string) => fs.readFileSync(p, 'utf8');

describe('Dashboard Messages — page extraction closeout', () => {
  it('DashboardMessages.tsx exists and stayed under previous size cap', () => {
    expect(fs.existsSync(PAGE)).toBe(true);
    const lines = read(PAGE).split('\n').length;
    expect(lines).toBeLessThan(1640);
  });

  it('useMessagesDerivations hook exists and exports the derivation API', () => {
    expect(fs.existsSync(HOOK)).toBe(true);
    const src = read(HOOK);
    expect(src).toMatch(/export\s+function\s+useMessagesDerivations/);
    expect(src).toMatch(/filteredConversations/);
    expect(src).toMatch(/groupedMessages/);
    expect(src).toMatch(/stats/);
  });

  it('hook is wired into the page', () => {
    const src = read(PAGE);
    expect(src).toMatch(/from\s+['"]@\/hooks\/useMessagesDerivations['"]/);
    expect(src).toMatch(/useMessagesDerivations\(\s*\{/);
  });

  it('hook performs no DB / RPC / mutation work', () => {
    const src = read(HOOK);
    expect(src.includes("from '@/integrations/supabase/client'")).toBe(false);
    for (const forbidden of [
      'supabase.from(',
      'useQuery(',
      'useMutation(',
      '.rpc(',
      'insertMessage',
      'markConversationMessagesRead',
    ]) {
      expect(src.includes(forbidden), `hook must not contain ${forbidden}`).toBe(false);
    }
  });

  it('hook contains no any / suppressions / hex colors', () => {
    const src = read(HOOK);
    expect(/\bas\s+any\b/.test(src)).toBe(false);
    expect(/:\s*any\b/.test(src)).toBe(false);
    expect(src.includes('@ts-ignore')).toBe(false);
    expect(src.includes('@ts-expect-error')).toBe(false);
    expect(src.includes('eslint-disable')).toBe(false);
    expect(/#[0-9a-fA-F]{3,8}\b/.test(src)).toBe(false);
  });

  it('send / read / subscription imports remain on the page', () => {
    const src = read(PAGE);
    for (const needle of [
      'insertMessage',
      'markConversationMessagesRead',
      'subscribeConversationMessages',
      'subscribeUserConversations',
      'uploadChatAttachment',
      'listConversationsForUser',
      'listMessagesForConversation',
      'listUnreadMessageConversationIds',
    ]) {
      expect(src.includes(needle), `page must still import ${needle}`).toBe(true);
    }
  });

  it('unread-count query key remains stable', () => {
    const src = read(PAGE);
    expect(src.includes("'unread-counts'")).toBe(true);
    expect(src.includes('totalUnread')).toBe(true);
  });

  it('page does not introduce DB migration / RLS / edge references', () => {
    const src = read(PAGE);
    for (const forbidden of [
      'service_role',
      'pg_policies',
      'supabase/migrations',
      'supabase/functions',
    ]) {
      expect(src.includes(forbidden), `page must not reference ${forbidden}`).toBe(false);
    }
  });

  it('dashboard messages route is still registered in App.tsx', () => {
    const app = read(APP);
    expect(app.includes('DashboardMessages')).toBe(true);
  });
});