import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(__dirname, '../../');
const SCRIPT = resolve(ROOT, 'scripts/messaging-isolation-audit.mjs');

describe('messaging-isolation-audit.mjs', () => {
  it('script file exists', () => {
    expect(existsSync(SCRIPT)).toBe(true);
  });

  it('declares the expected allowed production paths', () => {
    const src = readFileSync(SCRIPT, 'utf8');
    for (const p of [
      'src/modules/messaging/services/',
      'src/modules/messaging/constants/',
      'src/modules/messaging/index.ts',
    ]) {
      expect(src).toContain(p);
    }
  });

  it('enforces conversations + messages tables, chat-attachments bucket, and postgres_changes realtime', () => {
    const src = readFileSync(SCRIPT, 'utf8');
    expect(src).toContain('"conversations"');
    expect(src).toContain('"messages"');
    expect(src).toContain('chat-attachments');
    expect(src).toMatch(/CHAT_ATTACHMENTS_BUCKET/);
    expect(src).toMatch(/postgres_changes/);
  });

  it('DashboardMessages has no direct messaging backend access', () => {
    const src = readFileSync(
      resolve(ROOT, 'src/pages/dashboard/DashboardMessages.tsx'),
      'utf8',
    );
    expect(src).not.toMatch(/\.from\(\s*['"]messages['"]\s*\)\s*\.\s*(select|insert|update|delete|upsert)/);
    expect(src).not.toMatch(/\.from\(\s*['"]conversations['"]\s*\)\s*\.\s*(select|insert|update|delete|upsert)/);
    expect(src).not.toMatch(/supabase\.storage\.from\(\s*['"]chat-attachments['"]\s*\)/);
    expect(src).not.toMatch(/postgres_changes/);
  });

  it('useTypingPresence remains out of scope (broadcast/presence, no postgres_changes or table access)', () => {
    const src = readFileSync(resolve(ROOT, 'src/hooks/useTypingPresence.ts'), 'utf8');
    expect(src).toMatch(/supabase\.channel\(/);
    expect(src).not.toMatch(/postgres_changes/);
    expect(src).not.toMatch(/\.from\(\s*['"](conversations|messages)['"]\s*\)/);
  });

  it('currently passes (exit 0) against the live source tree', () => {
    const out = execFileSync('node', [SCRIPT], { cwd: ROOT, encoding: 'utf8' });
    expect(out).toMatch(/No unauthorized direct messaging access found/);
  }, 30_000);
});