import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(
  resolve(__dirname, '../../../../pages/dashboard/QuoteRequestDetails.tsx'),
  'utf8',
);

describe('QuoteRequestDetails.tsx regression (F3)', () => {
  it('does not directly access supabase.storage for quote-request-files', () => {
    expect(src).not.toMatch(/supabase\.storage\s*\.\s*from\(/);
    // Note: the string 'quote-request-files' may still appear as a React Query key.
    // We only forbid storage bucket access here.
  });

  it('does not directly insert into quote_request_files', () => {
    expect(src).not.toMatch(/\.from\(\s*['"]quote_request_files['"]\s*\)\s*\.insert/);
  });

  it('uses uploadQuoteRequestFile and createQuoteRequestFileRecord wrappers', () => {
    expect(src).toMatch(/uploadQuoteRequestFile\(/);
    expect(src).toMatch(/createQuoteRequestFileRecord\(/);
  });

  it('preserves the path generation pattern `${quote.id}/${Date.now()}-${i}-${safeFileName(f.name)}`', () => {
    expect(src).toMatch(/\$\{quote\.id\}\/\$\{Date\.now\(\)\}-\$\{i\}-\$\{safeFileName\(f\.name\)\}/);
  });

  it('still increments failed counter on upload error and still calls refetchFiles after the loop', () => {
    expect(src).toMatch(/failed\+\+/);
    expect(src).toMatch(/await\s+refetchFiles\(\)/);
  });

  it('preserves the per-iteration progress update', () => {
    expect(src).toMatch(/setUploading\(\{\s*done:\s*i\s*\+\s*1,\s*total:\s*toUpload\.length\s*\}\)/);
  });
});