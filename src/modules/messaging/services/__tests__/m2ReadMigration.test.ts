import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = resolve(__dirname, '../../../../');
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf8');

describe('M-2 migration: read callsites no longer touch conversations/messages directly', () => {
  const FILES = [
    'pages/dashboard/overview/UserDashboardView.tsx',
    'pages/dashboard/overview/ProviderDashboardView.tsx',
    'pages/dashboard/overview/AdminDashboardView.tsx',
    'components/dashboard/ProviderTipsCard.tsx',
    'components/dashboard/ProviderEngagementPreviews.tsx',
    'components/dashboard/overview/shared.tsx',
    'pages/admin/AdminUsers.tsx',
  ];

  for (const f of FILES) {
    it(`${f} contains no direct .from('conversations') or .from('messages') select`, () => {
      const src = read(f);
      expect(src, f).not.toMatch(/\.from\(\s*['"]conversations['"]\s*\)/);
      expect(src, f).not.toMatch(/\.from\(\s*['"]messages['"]\s*\)\s*\.\s*select/);
    });
  }

  it('BusinessProfile.tsx — find conversation read is migrated, mutations remain direct (deferred to M-3)', () => {
    const src = read('pages/BusinessProfile.tsx');
    // Read wrapper used
    expect(src).toMatch(/findConversationBetweenUsers\(/);
    // No direct .select on conversations
    expect(src).not.toMatch(/\.from\(\s*["']conversations["']\s*\)\s*\.\s*select/);
    // Deferred mutations remain
    expect(src).toMatch(/\.from\(\s*["']conversations["']\s*\)\s*\.\s*insert/);
    expect(src).toMatch(/\.from\(\s*["']messages["']\s*\)\s*\.\s*insert/);
  });

  it('DashboardMessages.tsx — all three reads migrated; mutations/realtime/storage remain deferred', () => {
    const src = read('pages/dashboard/DashboardMessages.tsx');
    expect(src).toMatch(/listConversationsForUser\(/);
    expect(src).toMatch(/listUnreadMessageConversationIds\(/);
    expect(src).toMatch(/listMessagesForConversation\(/);
    // No remaining .from('conversations').select
    expect(src).not.toMatch(/\.from\(\s*['"]conversations['"]\s*\)\s*\.\s*select/);
    // Remaining direct messages access must only be the mark-as-read update and the send insert
    expect(src).toMatch(/\.from\('messages'\)\.update\(\s*\{\s*is_read:\s*true\s*\}\s*\)/);
    expect(src).toMatch(/\.from\('messages'\)\.insert\(/);
    // Realtime + storage stay direct for M-4/M-5
    expect(src).toMatch(/postgres_changes/);
    expect(src).toMatch(/supabase\.storage\.from\(\s*'chat-attachments'\s*\)/);
  });

  it('useTypingPresence remains untouched (still uses supabase.channel directly)', () => {
    const src = read('hooks/useTypingPresence.ts');
    expect(src).toMatch(/supabase\.channel\(/);
  });
});