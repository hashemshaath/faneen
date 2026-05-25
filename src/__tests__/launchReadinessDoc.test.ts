import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * LAUNCH-FREEZE-1
 *
 * Guards the launch-readiness doc so its core assertions cannot
 * silently drift during the freeze.
 */
describe('docs/launch-readiness.md', () => {
  const docPath = path.resolve(process.cwd(), 'docs/launch-readiness.md');

  it('exists', () => {
    expect(fs.existsSync(docPath)).toBe(true);
  });

  const body = fs.existsSync(docPath) ? fs.readFileSync(docPath, 'utf-8') : '';

  it('mentions limited beta', () => {
    expect(body.toLowerCase()).toContain('limited beta');
  });

  it('mentions human-only production blockers', () => {
    expect(body.toLowerCase()).toMatch(/human-only/);
    expect(body.toLowerCase()).toMatch(/phone otp/);
    expect(body.toLowerCase()).toMatch(/google oauth/);
    expect(body.toLowerCase()).toMatch(/moyasar/);
  });

  it('mentions no automated P0/P1 blockers', () => {
    expect(body).toMatch(/no automated P0/i);
  });

  it('mentions BM-REF-REBUILD closed', () => {
    expect(body).toMatch(/BM-REF-REBUILD/);
    expect(body.toLowerCase()).toMatch(/closed/);
  });

  it('mentions 2553/2553 tests', () => {
    expect(body).toContain('2553/2553');
  });

  it('mentions cron / email queue confirmation', () => {
    expect(body.toLowerCase()).toMatch(/cron.*email queue|email queue.*cron/);
  });
});