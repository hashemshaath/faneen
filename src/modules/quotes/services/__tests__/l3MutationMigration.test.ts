import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(
  resolve(process.cwd(), 'src/pages/admin/AdminQuoteRequestDetails.tsx'),
  'utf8',
);

describe('L-3: AdminQuoteRequestDetails mutation migration', () => {
  it('no direct supabase.from("quote_requests").update', () => {
    expect(/supabase\s*\.\s*from\(\s*['"]quote_requests['"]\s*\)\s*\.\s*update\b/.test(SRC)).toBe(false);
  });

  it('no direct supabase.from("quote_request_events").insert', () => {
    expect(/supabase\s*\.\s*from\(\s*['"]quote_request_events['"]\s*\)\s*\.\s*insert\b/.test(SRC)).toBe(false);
  });

  it('imports and uses updateQuoteRequestById', () => {
    expect(SRC).toMatch(/updateQuoteRequestById/);
    expect(SRC).toMatch(/updateQuoteRequestById\s*\(/);
  });

  it('imports and uses insertQuoteRequestEvent', () => {
    expect(SRC).toMatch(/insertQuoteRequestEvent/);
    expect(SRC).toMatch(/insertQuoteRequestEvent\s*\(/);
  });

  it('preserves exact update payload fields (status, metadata) and eq("id", ...)', () => {
    expect(SRC).toMatch(/updateQuoteRequestById\(\s*\{[\s\S]*?id:\s*quote\.id[\s\S]*?values:\s*\{[\s\S]*?status:\s*vars\.newStatus[\s\S]*?metadata:\s*newMd[\s\S]*?\}/);
  });

  it('preserves quote_status_changed event payload fields', () => {
    expect(SRC).toMatch(/event_type:\s*'quote_status_changed'/);
    expect(SRC).toMatch(/previous_status:\s*previousStatus/);
    expect(SRC).toMatch(/new_status:\s*vars\.newStatus/);
    expect(SRC).toMatch(/has_admin_notes:\s*!!vars\.notes/);
  });

  it('preserves specific status-transition event payload', () => {
    expect(SRC).toMatch(/event_type:\s*specificType/);
    expect(SRC).toMatch(/actor_user_id:\s*user\?\.id\s*\?\?\s*null/);
  });

  it('preserves existing { error } throw behavior on update', () => {
    expect(SRC).toMatch(/const\s*\{\s*error\s*\}\s*=\s*await\s+updateQuoteRequestById\(/);
    expect(SRC).toMatch(/if\s*\(error\)\s*throw\s+error/);
  });

  it('L-4: edge calls migrated to service wrappers', () => {
    expect(SRC).not.toMatch(/supabase\.functions\.invoke\(\s*['"]admin-reveal-lead-contact['"]/);
    expect(SRC).not.toMatch(/supabase\.functions\.invoke\(\s*['"]match-quote-request['"]/);
    expect(SRC).toMatch(/adminRevealLeadContact\s*\(/);
    expect(SRC).toMatch(/matchQuoteRequest\s*\(/);
  });
});