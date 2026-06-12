import type { KnipConfig } from 'knip';

/**
 * Knip configuration for Qitaat.
 *
 * Tuned to surface real orphan code by declaring every dynamic / out-of-bundler
 * entry point that Knip cannot infer automatically. Do not widen `ignore` to
 * swallow real signal — add a precise entry instead.
 */
const config: KnipConfig = {
  entry: [
    // App + tooling roots
    'src/main.tsx',
    'index.html',
    'vite.config.ts',
    'vitest.config.ts',
    'playwright.config.ts',
    'playwright.cross-browser.config.ts',
    'playwright-fixture.ts',
    'tailwind.config.ts',
    'postcss.config.js',
    'eslint.config.js',
    'src/test/setup.ts',

    // Tests (vitest + playwright)
    'src/**/*.{test,spec}.{ts,tsx}',
    'src/**/__tests__/**/*.{ts,tsx}',
    'e2e/**/*.spec.ts',

    // CI / audit scripts referenced from workflows + package scripts.
    'scripts/**/*.{mjs,ts,js}',

    // Each Supabase Edge Function is its own deploy entry point (Deno runtime).
    'supabase/functions/*/index.ts',
    'supabase/functions/**/*_test.ts',
    'supabase/functions/**/*.test.ts',
  ],
  project: [
    'src/**/*.{ts,tsx}',
    'supabase/functions/**/*.{ts,tsx}',
    'scripts/**/*.{mjs,ts,js}',
  ],
  ignore: [
    // Auto-generated Supabase client + types — must never be flagged.
    'src/integrations/supabase/types.ts',
    'src/integrations/supabase/client.ts',

    // shadcn primitives kept by design for future composition.
    'src/components/ui/**',

    // Module public-API barrels — surfaces for cross-module imports.
    'src/modules/*/index.ts',

    // Email templates dispatched dynamically by template name from
    // send-transactional-email / auth-email-hook edge functions.
    'supabase/functions/_shared/transactional-email-templates/**',
    'supabase/functions/_shared/email-templates/**',
    'supabase/functions/_shared/email-layout/**',

    // Edge shared modules imported via relative paths across function boundaries
    // that Knip's TS resolver does not fully crawl (credits, google, health, …).
    'supabase/functions/_shared/**',
  ],
  ignoreDependencies: [
    // Tooling consumed by config files / vite plugins / lovable runtime.
    /^@types\//,
    'autoprefixer',
    'postcss',
    'tailwindcss-animate',
  ],
  ignoreBinaries: ['pdftotext', 'deno', 'supabase'],
  rules: {
    duplicates: 'off',
    enumMembers: 'off',
  },
};

export default config;