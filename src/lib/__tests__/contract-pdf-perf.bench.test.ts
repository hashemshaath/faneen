/**
 * PDF-PERF1 — Contract PDF rendering performance benchmark.
 *
 * Runs `buildContractPDF` against five shaped fixtures, measures wall-clock
 * duration, byte size, and page count. Soft-asserts against documented
 * budgets so CI reports trends without flaking on slow machines.
 *
 * Run:
 *   npm run test:pdf-perf
 *   (or: npx vitest run src/lib/__tests__/contract-pdf-perf.bench.test.ts)
 */
import { describe, it, expect, vi } from 'vitest';

// Same Arabic-font mock as PDF-QA1 — CDN fetch is unreliable in jsdom and
// would dominate the benchmark with network noise unrelated to render speed.
vi.mock('@/lib/pdf-arabic-font', () => ({
  ArabicPdfFontError: class ArabicPdfFontError extends Error {},
  registerArabicFont: async () => false,
  setupArabicDoc:     async () => false,
  verifyArabicFontReady: () => true,
  normalizeArabicPdfTextLayer: () => {},
  getArabicTableStyles: () => ({}),
  printContractSection: () => {},
}));

import { buildContractPDF } from '@/lib/contract-pdf-export';
import { PERF_FIXTURES, PERF_BUDGETS_MS, type PerfFixtureName } from '@/test/fixtures/contract-pdf-perf-fixtures';

interface Sample {
  name: PerfFixtureName;
  ms: number;
  bytes: number;
  pages: number;
  budgetMs: number;
  withinBudget: boolean;
}

const samples: Sample[] = [];

afterAll(() => {
   
  console.log('\nPDF-PERF1 results');
  console.log('─'.repeat(78));
  console.log('fixture'.padEnd(18), 'ms'.padStart(8), 'KB'.padStart(8),
              'pages'.padStart(6), 'budget'.padStart(8), 'status'.padStart(10));
  for (const s of samples) {
    console.log(
      s.name.padEnd(18),
      s.ms.toFixed(0).padStart(8),
      (s.bytes / 1024).toFixed(1).padStart(8),
      String(s.pages).padStart(6),
      String(s.budgetMs).padStart(8),
      (s.withinBudget ? 'OK' : 'OVER').padStart(10),
    );
  }
  console.log('─'.repeat(78));
   
});

describe('PDF-PERF1 — buildContractPDF benchmark', () => {
  for (const name of Object.keys(PERF_FIXTURES) as PerfFixtureName[]) {
    it(`benchmarks "${name}" within soft budget`, async () => {
      const fx = PERF_FIXTURES[name];
      const budget = PERF_BUDGETS_MS[name];

      // Warm-up to amortize one-time module init (jsPDF, autotable, qrcode).
      await buildContractPDF(fx);

      const t0 = performance.now();
      const doc = await buildContractPDF(fx);
      const ms = performance.now() - t0;

      const bytes = (doc.output('arraybuffer') as ArrayBuffer).byteLength;
      const pages = doc.getNumberOfPages();

      const sample: Sample = {
        name,
        ms,
        bytes,
        pages,
        budgetMs: budget,
        withinBudget: ms <= budget * 2,
      };
      samples.push(sample);

      // Hard sanity checks (never flake-able on CPU).
      expect(doc).toBeTruthy();
      expect(pages).toBeGreaterThanOrEqual(1);
      expect(bytes).toBeGreaterThan(500);

      // Soft assertion: 2× budget for CI tolerance.
      expect(
        ms,
        `"${name}" took ${ms.toFixed(0)}ms (budget ${budget}ms × 2 tolerance)`,
      ).toBeLessThan(budget * 2);
    }, 60_000);
  }
});
