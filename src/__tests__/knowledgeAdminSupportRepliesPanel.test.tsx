import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

describe('KNOWLEDGE ADMIN SUPPORT REPLIES PANEL — Phase 5B', () => {
  const PANEL = read('src/components/admin/knowledge/SupportRepliesPanel.tsx');
  const PAGE = read('src/pages/admin/AdminKnowledgeCenter.tsx');

  it('1) panel is mounted inside /admin/knowledge', () => {
    expect(PAGE).toMatch(/SupportRepliesPanel/);
    expect(PAGE).toMatch(/data-testid="knowledge-admin-section-support-replies"/);
    expect(PAGE).toMatch(/ردود الدعم/);
  });

  it('2) draft generation uses buildSupportReplyDraft helper', () => {
    expect(PANEL).toMatch(/buildSupportReplyDraft\(/);
    expect(PANEL).toMatch(/from\s+['"]@\/modules\/knowledge['"]/);
  });

  it('3) panel exposes sources block', () => {
    expect(PANEL).toMatch(/data-testid="support-reply-sources"/);
    expect(PANEL).toMatch(/draft\.sources/);
  });

  it('4) panel exposes canAnswer indicator', () => {
    expect(PANEL).toMatch(/data-testid="support-reply-can-answer"/);
    expect(PANEL).toMatch(/draft\.canAnswer/);
  });

  it('5) panel does not send any message (no transport imports)', () => {
    expect(PANEL).not.toMatch(/supabase/i);
    expect(PANEL).not.toMatch(/fetch\(/);
    expect(PANEL).not.toMatch(/sendEmail|sendWhatsApp|sendSms|notify\(/i);
    expect(PANEL).not.toMatch(/\.functions\.invoke/);
  });

  it('6) panel does not save / persist anything', () => {
    expect(PANEL).not.toMatch(/localStorage|sessionStorage/);
    expect(PANEL).not.toMatch(/\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
    expect(PANEL).not.toMatch(/\.rpc\(/);
  });

  it('purity: no any / suppressions in panel', () => {
    expect(PANEL).not.toMatch(/:\s*any\b/);
    expect(PANEL).not.toMatch(/\bas\s+any\b/);
    expect(PANEL).not.toMatch(/@ts-ignore/);
    expect(PANEL).not.toMatch(/@ts-expect-error/);
    expect(PANEL).not.toMatch(/eslint-disable/);
  });
});