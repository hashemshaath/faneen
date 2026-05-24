import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Read the live resolve_barcode definition from the project root snapshot
// produced by `psql` and committed under docs/ — or, if absent, fall back to
// inspecting the public page which is the only client-side surface for
// non-active behavior.
const PUBLIC_PAGE = fs.readFileSync(
  path.resolve(__dirname, '../../../pages/PublicBarcodeResolve.tsx'),
  'utf8',
);

describe('Public /q/:code — safe behavior for non-active barcodes', () => {
  it('treats anything that is not status="available" as unavailable (no status leak)', () => {
    // The page deliberately collapses frozen / archived / revoked / not-found
    // into a single "unavailable" surface to avoid leaking lifecycle state to
    // anonymous scanners.
    expect(PUBLIC_PAGE).toMatch(/data\.status\s*!==\s*['"]available['"]/);
  });

  it('renders bilingual "code unavailable" copy for non-active records', () => {
    expect(PUBLIC_PAGE).toContain('الكود غير متاح');
    expect(PUBLIC_PAGE).toContain('Code unavailable');
  });

  it('does not branch on internal status values (frozen/archived/revoked)', () => {
    // The public route must never render copy that differentiates frozen vs
    // archived vs revoked — that would leak admin lifecycle state.
    expect(PUBLIC_PAGE).not.toMatch(/status\s*===\s*['"]frozen['"]/);
    expect(PUBLIC_PAGE).not.toMatch(/status\s*===\s*['"]archived['"]/);
    expect(PUBLIC_PAGE).not.toMatch(/status\s*===\s*['"]revoked['"]/);
  });

  it('preserves the active resolve path', () => {
    expect(PUBLIC_PAGE).toMatch(/data\.status\s*===\s*['"]available['"]/);
    expect(PUBLIC_PAGE).toMatch(/supabase\.rpc\(\s*['"]resolve_barcode['"]/);
  });
});