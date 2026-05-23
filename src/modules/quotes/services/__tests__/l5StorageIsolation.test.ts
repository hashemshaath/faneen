import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const SRC = resolve(__dirname, '../../../../');
const BUCKET = 'quote-request-files';

const ALLOWED_STORAGE_FILES = new Set<string>([
  // Canonical upload wrapper
  resolve(SRC, 'modules/quotes/services/uploadQuoteRequestFile.ts'),
  // Canonical signed URL helper
  resolve(SRC, 'lib/quoteRequests.ts'),
  // Bucket name constant
  resolve(SRC, 'modules/leads/constants/storage.ts'),
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) {
      if (name === '__tests__' || name === 'node_modules') continue;
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

const FILES = walk(SRC);

describe('L-5: quote-request-files storage isolation', () => {
  it('only the allow-listed wrappers reference the quote-request-files bucket via supabase.storage', () => {
    const offenders: string[] = [];
    for (const f of FILES) {
      if (ALLOWED_STORAGE_FILES.has(f)) continue;
      const src = readFileSync(f, 'utf8');
      // Direct storage access by literal bucket name
      if (/supabase\.storage\s*\.\s*from\(\s*['"]quote-request-files['"]/.test(src)) {
        offenders.push(f);
        continue;
      }
      // Direct storage access via QUOTE_BUCKET constant
      if (/storage\s*\.\s*from\(\s*QUOTE_BUCKET\s*\)/.test(src)) {
        offenders.push(f);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('uploadQuoteRequestFile remains the canonical upload wrapper (single storage upload call)', () => {
    const src = readFileSync(
      resolve(SRC, 'modules/quotes/services/uploadQuoteRequestFile.ts'),
      'utf8',
    );
    expect(src).toMatch(/\.from\(\s*['"]quote-request-files['"]\s*\)/);
    expect(src).toMatch(/\.upload\(/);
  });

  it('createSignedQuoteFileUrl remains the canonical signed URL helper', () => {
    const src = readFileSync(resolve(SRC, 'lib/quoteRequests.ts'), 'utf8');
    expect(src).toMatch(/export\s+async\s+function\s+createSignedQuoteFileUrl/);
    expect(src).toMatch(/\.createSignedUrl\(/);
  });

  it('Quote.tsx and QuoteRequestDetails.tsx do not directly access supabase.storage', () => {
    for (const rel of ['pages/Quote.tsx', 'pages/dashboard/QuoteRequestDetails.tsx']) {
      const p = resolve(SRC, rel);
      const src = readFileSync(p, 'utf8');
      expect(src, rel).not.toMatch(/supabase\.storage\s*\.\s*from\(/);
    }
  });

  it('createQuoteRequestFileRecord remains the only wrapper inserting into quote_request_files', () => {
    const offenders: string[] = [];
    const ALLOWED_INSERT = resolve(
      SRC,
      'modules/quotes/services/createQuoteRequestFileRecord.ts',
    );
    for (const f of FILES) {
      if (f === ALLOWED_INSERT) continue;
      const src = readFileSync(f, 'utf8');
      if (/\.from\(\s*['"]quote_request_files['"]\s*\)\s*\.insert/.test(src)) {
        offenders.push(f);
      }
    }
    expect(offenders).toEqual([]);
  });
});