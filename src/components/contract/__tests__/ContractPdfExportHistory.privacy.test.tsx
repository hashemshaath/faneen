import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(
  path.resolve(__dirname, '../ContractPdfExportHistory.tsx'),
  'utf8',
);

describe('ContractPdfExportHistory — privacy guards', () => {
  it('does not reference raw exporter UUID fields', () => {
    expect(SRC).not.toMatch(/\bexported_by\b/);
    expect(SRC).not.toMatch(/\.email\b/);
    expect(SRC).not.toMatch(/\bphone\b/);
  });
  it('does not reference IP/user-agent hashes', () => {
    expect(SRC).not.toMatch(/\bip_hash\b/);
    expect(SRC).not.toMatch(/\buser_agent_hash\b/);
  });
  it('does not select raw rows from contract_pdf_exports table', () => {
    expect(SRC).not.toMatch(/from\(['"]contract_pdf_exports['"]\)/);
  });
  it('uses the safe RPC for queries', () => {
    expect(SRC).toContain('list_contract_pdf_exports');
  });
  it('redacts UUID-like strings before rendering', () => {
    expect(SRC).toContain('safeText');
  });
});
