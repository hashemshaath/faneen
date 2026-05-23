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

  it('BusinessProfile.tsx — find conversation read is migrated (mutations migrated in M-3)', () => {
    const src = read('pages/BusinessProfile.tsx');
    // Read wrapper used
    expect(src).toMatch(/findConversationBetweenUsers\(/);
    // No direct .select on conversations
    expect(src).not.toMatch(/\.from\(\s*["']conversations["']\s*\)\s*\.\s*select/);
  });

  it('DashboardMessages.tsx — all three reads migrated; storage remains deferred', () => {
    const src = read('pages/dashboard/DashboardMessages.tsx');
    expect(src).toMatch(/listConversationsForUser\(/);
    expect(src).toMatch(/listUnreadMessageConversationIds\(/);
    expect(src).toMatch(/listMessagesForConversation\(/);
    // No remaining .from('conversations').select
    expect(src).not.toMatch(/\.from\(\s*['"]conversations['"]\s*\)\s*\.\s*select/);
    // Storage migrated in M-5: no direct chat-attachments access remains
    expect(src).not.toMatch(/supabase\.storage\.from\(\s*['"]chat-attachments['"]\s*\)/);
  });

  it('useTypingPresence remains untouched (still uses supabase.channel directly)', () => {
    const src = read('hooks/useTypingPresence.ts');
    expect(src).toMatch(/supabase\.channel\(/);
  });
});