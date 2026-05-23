import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = resolve(__dirname, '../../../../');
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf8');

describe('M-4 migration: messaging realtime callsites use helper wrappers', () => {
  it('DashboardMessages.tsx — uses realtime helpers; no direct supabase.channel postgres_changes', () => {
    const src = read('pages/dashboard/DashboardMessages.tsx');
    expect(src).toMatch(/subscribeConversationMessages\(/);
    expect(src).toMatch(/subscribeUserConversations\(/);
    // No direct postgres_changes subscriptions remain in this file
    expect(src).not.toMatch(/postgres_changes/);
    // No direct messages/conversations channel construction
    expect(src).not.toMatch(/supabase\.channel\(\s*`messages-/);
    expect(src).not.toMatch(/supabase\.channel\(\s*['"]conversations-list['"]/);
    // Read + mutation wrappers from M-2/M-3 still intact
    expect(src).toMatch(/listMessagesForConversation\(/);
    expect(src).toMatch(/insertMessage\(/);
    expect(src).toMatch(/markConversationMessagesRead\(/);
    // Storage still deferred to M-5
    expect(src).toMatch(/supabase\.storage\.from\(\s*'chat-attachments'\s*\)/);
    // Invalidation keys preserved
    expect(src).toMatch(/queryKey:\s*\['messages',\s*selectedConversation\]/);
    expect(src).toMatch(/queryKey:\s*\['conversations',\s*user\.id\]/);
    expect(src).toMatch(/queryKey:\s*\['unread-counts',\s*user\.id\]/);
  });

  it('useTypingPresence remains untouched (still uses supabase.channel for presence/broadcast)', () => {
    const src = read('hooks/useTypingPresence.ts');
    expect(src).toMatch(/supabase\.channel\(/);
    // Must not have been refactored to postgres_changes
    expect(src).not.toMatch(/postgres_changes/);
  });
});