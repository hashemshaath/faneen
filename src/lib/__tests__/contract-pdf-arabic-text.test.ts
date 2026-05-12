import { describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const run = promisify(execFile);
const normalizeArabic = (s: string) =>
  s.normalize('NFKC').replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u200E\u200F\u202A-\u202E]/g, '');

describe('PDF-AR2 — Arabic pdftotext regression', () => {
  it('extracts Arabic and Quran sample without mojibake', async () => {
    const { stdout } = await run('node', ['scripts/verify-pdf-arabic.mjs']);
    const result = JSON.parse(stdout) as {
      status: string;
      pdfPath?: string;
      found: Record<string, boolean>;
      mojibakeDetected: boolean;
      extractedSample: string;
    };

    expect(result.status).toBe('PASS');
    expect(result.mojibakeDetected).toBe(false);
    for (const word of ['العقد', 'الضريبة', 'الضمان', 'الشروط', 'الله', 'أحد']) {
      expect(result.found[word], `missing ${word}`).toBe(true);
    }
    expect(normalizeArabic(result.extractedSample)).not.toContain('þ');
    if (result.pdfPath) {
      await expect(readFile(result.pdfPath)).resolves.toBeTruthy();
    }
  }, 60_000);
});
