import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('ensure-business isolation (P-25)', () => {
  const source = readFileSync(
    resolve(__dirname, '../ensure-business.ts'),
    'utf-8',
  );

  it('does not read businesses directly via supabase client', () => {
    expect(source).not.toMatch(/\.from\(\s*['"]businesses['"]\s*\)\s*\.\s*select\s*\(/);
  });

  it('does not write businesses directly via supabase client', () => {
    expect(source).not.toMatch(
      /\.from\(\s*['"]businesses['"]\s*\)\s*\.\s*(insert|update|delete|upsert)\b/,
    );
  });

  it('delegates to canonical businesses services', () => {
    expect(source).toMatch(/from '@\/modules\/businesses'/);
    expect(source).toMatch(/\bgetOwnerBusiness\b/);
    expect(source).toMatch(/\binsertBusiness\b/);
  });
});