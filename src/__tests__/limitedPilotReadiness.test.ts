/**
 * LIMITED PILOT READINESS — runbook guard.
 *
 * Static checks against the runbook doc. Ensures the pilot stays
 * limited, the assistant stays internal, and no backend wiring
 * was touched as part of this track.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..');
const RUNBOOK = path.join(ROOT, 'docs/limited-pilot-runbook.md');

const read = (p: string) => fs.readFileSync(p, 'utf8');

describe('LIMITED PILOT READINESS', () => {
  it('runbook file exists and is non-empty', () => {
    expect(fs.existsSync(RUNBOOK)).toBe(true);
    expect(read(RUNBOOK).length).toBeGreaterThan(500);
  });

  const src = () => read(RUNBOOK);

  it('declares the launch as Limited Pilot (not public)', () => {
    expect(src()).toMatch(/Limited Pilot/);
    expect(src()).toMatch(/NOT a public launch/i);
  });

  it('states public assistant is disabled', () => {
    expect(src()).toMatch(/public assistant is disabled/i);
  });

  it('states assistant runs internal only', () => {
    expect(src()).toMatch(/internal_preview/);
    expect(src()).toMatch(/داخلي(ًا)? فقط|internal/i);
  });

  it('states RFQs are under manual monitoring', () => {
    expect(src()).toMatch(/manual monitoring|مراقبة يدوية/);
  });

  it('states prices are not guessed by the system', () => {
    expect(src()).toMatch(/لا تُخمن/);
  });

  it('states warranties are never promised by the system', () => {
    expect(src()).toMatch(/لا يُوعد به/);
  });

  it('states private provider contact data is not shown publicly', () => {
    expect(src()).toMatch(/لا تُعرض للعامة/);
  });

  it('runbook track introduces no DB / RLS / RPC / migration / edge changes', () => {
    // The runbook is documentation-only. Make sure it neither lives under,
    // nor instructs editing, backend wiring.
    expect(RUNBOOK.includes('supabase/')).toBe(false);
    const body = src();
    for (const forbidden of [
      'CREATE TABLE',
      'ALTER TABLE',
      'CREATE POLICY',
      'service_role',
      'supabase/migrations',
      'supabase/functions/_shared',
    ]) {
      expect(body.includes(forbidden), `${forbidden} in runbook`).toBe(false);
    }
  });
});