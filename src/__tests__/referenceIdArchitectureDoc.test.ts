/**
 * BM-REF-REBUILD-CLOSEOUT-1
 *
 * Source-guard assertions for docs/reference-id-architecture.md.
 * These are documentation-invariant checks, not functional tests.
 */
import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';

const DOC_PATH = path.join(process.cwd(), 'docs/reference-id-architecture.md');

function readDoc(): string {
  return fs.readFileSync(DOC_PATH, 'utf8');
}

describe('Reference-ID Architecture Doc', () => {
  it('exists', () => {
    expect(fs.existsSync(DOC_PATH)).toBe(true);
  });

  it('includes UUID/internal FK rule', () => {
    const doc = readDoc();
    expect(doc).toMatch(/UUID.*internal foreign key/i);
  });

  it('includes ref_id official rule', () => {
    const doc = readDoc();
    expect(doc).toMatch(/ref_id.*official displayed reference/i);
  });

  it('includes legacy_ref_id compatibility rule', () => {
    const doc = readDoc();
    expect(doc).toMatch(/legacy_ref_id.*backward compatibility/i);
  });

  it('includes /r/:refId', () => {
    const doc = readDoc();
    expect(doc).toMatch(/\/r\/:refId/);
  });

  it('includes provider_intent_id not official', () => {
    const doc = readDoc();
    expect(doc).toMatch(/provider_intent_id.*not official/i);
    expect(doc).toMatch(/Never display.*provider_intent_id/);
  });

  it('includes token not official', () => {
    const doc = readDoc();
    expect(doc).toMatch(/invitation_token.*secret/i);
    expect(doc).toMatch(/Never display.*invitation token/);
  });

  it('includes synthetic email not official', () => {
    const doc = readDoc();
    expect(doc).toMatch(/synthetic email/i);
    expect(doc).toMatch(/email.*not official/i);
  });
});
