import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = resolve(__dirname, '../../../../');
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf8');

describe('M-3 migration: messaging mutation callsites use service wrappers', () => {
  it('BusinessProfile.tsx — uses createConversation + insertMessage; no direct mutations', () => {
    const src = read('pages/BusinessProfile.tsx');
    expect(src).toMatch(/createConversation\(/);
    expect(src).toMatch(/insertMessage\(/);
    // No direct conversations/messages mutation calls remain
    expect(src).not.toMatch(/\.from\(\s*["']conversations["']\s*\)\s*\.\s*insert/);
    expect(src).not.toMatch(/\.from\(\s*["']messages["']\s*\)\s*\.\s*insert/);
    expect(src).not.toMatch(/\.from\(\s*["']messages["']\s*\)\s*\.\s*update/);
    // Greeting payload fields preserved
    expect(src).toMatch(/message_type:\s*"text"/);
    expect(src).toMatch(/content:\s*greeting/);
    // Create payload preserved
    expect(src).toMatch(/participant_1:\s*user\.id/);
    expect(src).toMatch(/participant_2:\s*providerId/);
    // Error handling preserved
    expect(src).toMatch(/if \(createError\) throw createError/);
  });

  it('DashboardMessages.tsx — uses insertMessage + markConversationMessagesRead; no direct messages mutations', () => {
    const src = read('pages/dashboard/DashboardMessages.tsx');
    expect(src).toMatch(/insertMessage\(/);
    expect(src).toMatch(/markConversationMessagesRead\(/);
    expect(src).not.toMatch(/\.from\(\s*['"]messages['"]\s*\)\s*\.\s*insert/);
    expect(src).not.toMatch(/\.from\(\s*['"]messages['"]\s*\)\s*\.\s*update/);
    expect(src).not.toMatch(/\.from\(\s*['"]conversations['"]\s*\)\s*\.\s*(insert|update)/);
    // Send payload fields preserved
    expect(src).toMatch(/conversation_id:\s*selectedConversation!/);
    expect(src).toMatch(/sender_id:\s*user!\.id/);
    expect(src).toMatch(/attachment_url:\s*attachmentUrl/);
    expect(src).toMatch(/message_type:\s*msgType/);
    // Mark-as-read inputs preserved
    expect(src).toMatch(/conversationId:\s*selectedConversation/);
    expect(src).toMatch(/viewerUserId:\s*user\.id/);
    // Fail-soft .then chain preserved on mark-read
    expect(src).toMatch(/markConversationMessagesRead\(\{[\s\S]*?\}\)\.then\(/);
    // Realtime + storage intentionally deferred to M-4/M-5
    expect(src).toMatch(/postgres_changes/);
    expect(src).toMatch(/supabase\.storage\.from\(\s*'chat-attachments'\s*\)/);
  });
});