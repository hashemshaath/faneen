import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = resolve(__dirname, '../../../../');
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf8');

describe('M-5 migration: messaging storage callsites use canonical wrappers', () => {
  it('DashboardMessages.tsx — uses chat-attachments storage helpers; no direct supabase.storage access', () => {
    const src = read('pages/dashboard/DashboardMessages.tsx');
    expect(src).toMatch(/uploadChatAttachment\(/);
    expect(src).toMatch(/getChatAttachmentPublicUrl\(/);
    expect(src).not.toMatch(/supabase\.storage\.from\(\s*['"]chat-attachments['"]\s*\)/);
    expect(src).not.toMatch(/supabase\.storage\.from\(/);

    // Path format preserved
    expect(src).toMatch(/`\$\{user!\.id\}\/\$\{Date\.now\(\)\}-\$\{Math\.random\(\)\.toString\(36\)\.slice\(2,\s*8\)\}\.\$\{ext\}`/);
    // Upload options preserved
    expect(src).toMatch(/uploadChatAttachment\(fileName,\s*toUpload,\s*\{\s*contentType:\s*toUpload\.type\s*\}\)/);
    // Public URL extraction preserved
    expect(src).toMatch(/getChatAttachmentPublicUrl\(fileName\)/);
    expect(src).toMatch(/return\s+urlData\.publicUrl/);
    // attachment_url flow into insertMessage preserved
    expect(src).toMatch(/attachmentUrl\s*=\s*await\s+uploadFile\(attachedFile\)/);
    expect(src).toMatch(/insertMessage\(\{[\s\S]*attachment_url:\s*attachmentUrl/);
    // Realtime helpers remain used
    expect(src).toMatch(/subscribeConversationMessages\(/);
    expect(src).toMatch(/subscribeUserConversations\(/);
    // Read/mutation services remain used
    expect(src).toMatch(/listMessagesForConversation\(/);
    expect(src).toMatch(/insertMessage\(/);
    expect(src).toMatch(/markConversationMessagesRead\(/);
  });
});